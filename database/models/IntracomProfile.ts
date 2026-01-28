// database/models/IntracomProfile.ts
import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

export default class IntracomProfile extends Model {
    static table = 'intracom_profile';

    @text('login') login!: string;
    @text('student_id') studentId!: string;
    @text('campus') campus!: string;
    @text('semester') semester!: string;
    @text('first_name') firstName!: string;
    @text('last_name') lastName!: string;
    @text('email') email!: string;
    @text('data') data!: string; // Full JSON blob just in case
}
