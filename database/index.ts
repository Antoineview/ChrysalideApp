import IntracomEvent from './models/IntracomEvent';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { Absence, Attendance, AttendancePeriod, Exclusion } from '@/database/models/Attendance';
import CanteenMenu from '@/database/models/CanteenMenu';
import { Chat, Message, Recipient } from '@/database/models/Chat';
import Event from '@/database/models/Event';
import { Grade, Period, PeriodGrades } from '@/database/models/Grades';
import Homework from "@/database/models/Homework";
import Ical from '@/database/models/Ical';
import News from '@/database/models/News';
import Subject from '@/database/models/Subject';
import Course from '@/database/models/Timetable';

import { Balance } from './models/Balance';
import CanteenHistoryItem from './models/CanteenHistory';
import Kid from './models/Kid';
import { mySchema } from './schema';

const adapter = new SQLiteAdapter({
  schema: mySchema,
});

export const database = new Database({
  adapter,
  modelClasses: [
    IntracomEvent,
    Event,
    Ical,
    Subject,
    Homework,
    News,
    Period,
    Grade,
    PeriodGrades,
    Attendance,
    AttendancePeriod,
    Exclusion,
    Absence,
    CanteenMenu,
    Chat,
    Message,
    Recipient,
    Course,
    Kid,
    Balance,
    CanteenHistoryItem
  ],
});
