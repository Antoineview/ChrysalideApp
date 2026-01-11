import { Q } from '@nozbe/watermelondb';
import { getDatabaseInstance } from './DatabaseProvider';
import { safeWrite } from './utils/safeTransaction';
import { IntracomEventModel } from './models/IntracomEvent';

export async function syncIntracomEvents(events: IntracomEventModel[]) {
    const db = getDatabaseInstance();
    await safeWrite(db, async () => {
        const collection = db.get('intracomevents');
        for (const event of events) {
            const eventId = String(event.id);
            const existing = await collection.query(Q.where('id', eventId)).fetch();

            if (existing.length > 0) {
                await existing[0].update((rec: any) => {
                    rec.date = event.date;
                    rec.type = event.type;
                    rec.name = event.name;
                    rec.campusSlug = event.campusSlug;
                    rec.registeredStudents = event.registeredStudents;
                    rec.nbNewStudents = event.nbNewStudents;
                    rec.maxStudents = event.maxStudents;
                    rec.position = event.position ? JSON.stringify(event.position) : null;
                });
            } else {
                await collection.create((rec: any) => {
                    rec._raw.id = eventId;
                    rec.date = event.date;
                    rec.type = event.type;
                    rec.name = event.name;
                    rec.campusSlug = event.campusSlug;
                    rec.registeredStudents = event.registeredStudents;
                    rec.nbNewStudents = event.nbNewStudents;
                    rec.maxStudents = event.maxStudents;
                    rec.position = event.position ? JSON.stringify(event.position) : null;
                });
            }
        }
    }, 10000, 'syncIntracomEvents');
}
