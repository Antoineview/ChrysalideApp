import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
    migrations: [
        {
            toVersion: 46,
            steps: [
                createTable({
                    name: 'intracom_profile',
                    columns: [
                        { name: "login", type: "string" },
                        { name: "student_id", type: "string" },
                        { name: "campus", type: "string" },
                        { name: "semester", type: "string" },
                        { name: "first_name", type: "string" },
                        { name: "last_name", type: "string" },
                        { name: "email", type: "string" },
                        { name: "data", type: "string" },
                    ],
                }),
            ],
        },
        {
            toVersion: 45,
            steps: [
                createTable({
                    name: 'intracom_registered_events',
                    columns: [
                        { name: "eventId", type: "number", isIndexed: true },
                        { name: "date", type: "number" },
                        { name: "type", type: "string" },
                        { name: "name", type: "string" },
                        { name: "campusSlug", type: "string" },
                        { name: "registeredStudents", type: "number" },
                        { name: "nbNewStudents", type: "number" },
                        { name: "maxStudents", type: "number" },
                        { name: "state", type: "string" },
                        { name: "createdByAccount", type: "string", isIndexed: true },
                        { name: "address", type: "string", isOptional: true },
                        { name: "zipcode", type: "string", isOptional: true },
                        { name: "town", type: "string", isOptional: true },
                        { name: "latitude", type: "number", isOptional: true },
                        { name: "longitude", type: "number", isOptional: true },
                        { name: "slotTimes", type: "string", isOptional: true },
                        { name: "participants", type: "string", isOptional: true },
                        { name: "bonus", type: "number", isOptional: true },
                    ],
                }),
            ],
        },
        {
            toVersion: 44,
            steps: [
                addColumns({
                    table: 'intracom_events',
                    columns: [
                        { name: 'bonus', type: 'number', isOptional: true },
                    ],
                }),
            ],
        },
        {
            toVersion: 43,
            steps: [
                addColumns({
                    table: 'intracom_bonus',
                    columns: [
                        { name: 'history', type: 'string', isOptional: true },
                    ],
                }),
            ],
        },
        {
            toVersion: 41,
            steps: [
                addColumns({
                    table: 'intracom_events',
                    columns: [
                        { name: 'slotTimes', type: 'string', isOptional: true },
                        { name: 'participants', type: 'string', isOptional: true },
                    ],
                }),
            ],
        },
        {
            toVersion: 42,
            steps: [
                createTable({
                    name: 'intracom_bonus',
                    columns: [
                        { name: 'total', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                        { name: 'student_id', type: 'string' },
                    ],
                }),
            ],
        },
    ],
});
