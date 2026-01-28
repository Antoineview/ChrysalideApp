import { Q } from "@nozbe/watermelondb";
import { useEffect, useState } from "react";

import { IntracomEvent } from "@/app/(tabs)/news/components/IntracomCard";
import { database } from "@/database";
import IntracomRegisteredEvent from "@/database/models/IntracomRegisteredEvent";

export const useIntracomWidgetData = () => {
    const [event, setEvent] = useState<IntracomEvent | null>(null);

    useEffect(() => {
        const fetchEvent = async () => {
            const now = new Date();
            // Reset to midnight
            now.setHours(0, 0, 0, 0);

            try {
                const events = await database.get<IntracomRegisteredEvent>('intracom_registered_events')
                    .query(
                        Q.where('date', Q.gte(now.getTime())),
                        Q.sortBy('date', Q.asc),
                        Q.take(1)
                    ).fetch();

                if (events.length > 0) {
                    const e = events[0];
                    const mappedEvent: IntracomEvent = {
                        id: e.eventId,
                        title: e.name,
                        date: e.date,
                        type: e.type,
                        name: e.name,
                        campusSlug: e.campusSlug,
                        registeredStudents: e.registeredStudents,
                        nbNewStudents: e.nbNewStudents,
                        maxStudents: e.maxStudents,
                        state: e.state as any,
                        address: e.address,
                        zipcode: e.zipcode,
                        town: e.town,
                        latitude: e.latitude,
                        longitude: e.longitude,
                        slotTimes: e.slotTimes,
                        participants: e.participants,
                        bonus: e.bonus
                    };
                    setEvent(mappedEvent);
                } else {
                    setEvent(null);
                }
            } catch (error) {
                console.error("Error fetching Intracom widget data:", error);
                setEvent(null);
            }
        };

        fetchEvent();
    }, []);

    return { event };
};
