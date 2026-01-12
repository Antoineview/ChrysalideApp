import { Model, Q } from "@nozbe/watermelondb";

import { error, info } from "@/utils/logger/logger";

import { getDatabaseInstance } from "./DatabaseProvider";
import IntracomEvent from "./models/IntracomEvent";
import { safeWrite } from "./utils/safeTransaction";

export interface IntracomEventData {
    id: number;
    date: string;
    type: string;
    name: string;
    campusSlug: string;
    registeredStudents: number;
    nbNewStudents: number;
    maxStudents: number;
    state: "OPEN" | "CLOSED";
    // Location fields (optional, filled when event details are fetched)
    address?: string;
    zipcode?: string;
    town?: string;
    latitude?: number;
    longitude?: number;
}

export async function saveIntracomEventsToDatabase(
    events: IntracomEventData[],
    accountId: string
): Promise<void> {
    const db = getDatabaseInstance();

    await safeWrite(
        db,
        async () => {
            for (const event of events) {
                const existing = await db
                    .get<IntracomEvent>("intracom_events")
                    .query(Q.where("eventId", event.id))
                    .fetch();

                if (existing.length > 0) {
                    // Update existing event
                    await existing[0].update((record: Model) => {
                        const intracomEvent = record as IntracomEvent;
                        Object.assign(intracomEvent, {
                            date: new Date(event.date).getTime(),
                            type: event.type,
                            name: event.name,
                            campusSlug: event.campusSlug,
                            registeredStudents: event.registeredStudents,
                            nbNewStudents: event.nbNewStudents,
                            maxStudents: event.maxStudents,
                            state: event.state,
                        });
                    });
                } else {
                    // Create new event
                    await db.get("intracom_events").create((record: Model) => {
                        const intracomEvent = record as IntracomEvent;
                        Object.assign(intracomEvent, {
                            eventId: event.id,
                            date: new Date(event.date).getTime(),
                            type: event.type,
                            name: event.name,
                            campusSlug: event.campusSlug,
                            registeredStudents: event.registeredStudents,
                            nbNewStudents: event.nbNewStudents,
                            maxStudents: event.maxStudents,
                            state: event.state,
                            createdByAccount: accountId,
                        });
                    });
                }
            }
            info(`🍉 Saved ${events.length} Intracom events to database`);
        },
        10000,
        "saveIntracomEventsToDatabase"
    );
}

export async function getIntracomEventsFromCache(
    accountId: string
): Promise<IntracomEventData[]> {
    try {
        const db = getDatabaseInstance();
        const events = await db
            .get<IntracomEvent>("intracom_events")
            .query(Q.where("createdByAccount", accountId))
            .fetch();

        return events.map((event) => ({
            id: event.eventId,
            date: new Date(event.date).toISOString(),
            type: event.type,
            name: event.name,
            campusSlug: event.campusSlug,
            registeredStudents: event.registeredStudents,
            nbNewStudents: event.nbNewStudents,
            maxStudents: event.maxStudents,
            state: event.state as "OPEN" | "CLOSED",
            address: event.address,
            zipcode: event.zipcode,
            town: event.town,
            latitude: event.latitude,
            longitude: event.longitude,
        }));
    } catch (e) {
        error(`Failed to get Intracom events from cache: ${e}`);
        return [];
    }
}

export async function clearIntracomEventsForAccount(
    accountId: string
): Promise<void> {
    const db = getDatabaseInstance();

    await safeWrite(
        db,
        async () => {
            const events = await db
                .get<IntracomEvent>("intracom_events")
                .query(Q.where("createdByAccount", accountId))
                .fetch();

            for (const event of events) {
                await event.markAsDeleted();
                await event.destroyPermanently();
            }
        },
        10000,
        "clearIntracomEventsForAccount"
    );
}

export interface IntracomEventDetailsData {
    address: string;
    zipcode: string;
    town: string;
    latitude: number;
    longitude: number;
}

export async function updateIntracomEventDetails(
    eventId: number,
    details: IntracomEventDetailsData
): Promise<void> {
    const db = getDatabaseInstance();

    await safeWrite(
        db,
        async () => {
            const existing = await db
                .get<IntracomEvent>("intracom_events")
                .query(Q.where("eventId", eventId))
                .fetch();

            if (existing.length > 0) {
                await existing[0].update((record: Model) => {
                    const intracomEvent = record as IntracomEvent;
                    Object.assign(intracomEvent, {
                        address: details.address,
                        zipcode: details.zipcode,
                        town: details.town,
                        latitude: details.latitude,
                        longitude: details.longitude,
                    });
                });
            }
        },
        10000,
        "updateIntracomEventDetails"
    );
}

export async function getIntracomEventDetailsFromCache(
    eventId: number
): Promise<IntracomEventDetailsData | null> {
    try {
        const db = getDatabaseInstance();
        const events = await db
            .get<IntracomEvent>("intracom_events")
            .query(Q.where("eventId", eventId))
            .fetch();

        if (events.length > 0 && events[0].latitude) {
            return {
                address: events[0].address || '',
                zipcode: events[0].zipcode || '',
                town: events[0].town || '',
                latitude: events[0].latitude,
                longitude: events[0].longitude || 0,
            };
        }
        return null;
    } catch (e) {
        error(`Failed to get Intracom event details from cache: ${e}`);
        return null;
    }
}
