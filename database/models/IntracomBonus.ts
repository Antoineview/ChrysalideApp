// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Model } from "@nozbe/watermelondb";
import { date, field } from "@nozbe/watermelondb/decorators";

export default class IntracomBonus extends Model {
    static table = "intracom_bonus";

    @field("total") total: number;
    @date("updated_at") updatedAt: number;
    @field("student_id") studentId: string;
    @field("history") history: string;
}
