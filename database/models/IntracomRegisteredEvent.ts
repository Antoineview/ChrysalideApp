// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class IntracomRegisteredEvent extends Model {
    static table = "intracom_registered_events";

    @field("eventId") eventId: number;
    @field("date") date: number;
    @field("type") type: string;
    @field("name") name: string;
    @field("campusSlug") campusSlug: string;
    @field("registeredStudents") registeredStudents: number;
    @field("nbNewStudents") nbNewStudents: number;
    @field("maxStudents") maxStudents: number;
    @field("state") state: string;
    @field("createdByAccount") createdByAccount: string;
    @field("address") address?: string;
    @field("zipcode") zipcode?: string;
    @field("town") town?: string;
    @field("latitude") latitude?: number;
    @field("longitude") longitude?: number;
    @field("slotTimes") slotTimes?: string;
    @field("participants") participants?: string;
    @field("bonus") bonus?: number;
}
