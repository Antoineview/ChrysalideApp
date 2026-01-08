// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Model } from '@nozbe/watermelondb';
import { children, field, relation } from '@nozbe/watermelondb/decorators';

export class Attendance extends Model {
  static table = "attendance";

  static associations = {
    attendance_periods: { type: 'has_many', foreignKey: 'attendanceId' },
  };
  
  @field('levelId') levelId: number;
  @field('semesterId') semesterId: number;
  @field('levelName') levelName: string;
  @field('promo') promo: number;

  @children('attendance_periods') periods: Query<AttendancePeriod>;
}

export class AttendancePeriod extends Model {
  static table = "attendance_periods";

  static associations = {
    attendance: { type: 'belongs_to', key: 'attendanceId' },
    absences: { type: 'has_many', foreignKey: 'periodId' },
    exclusions: { type: 'has_many', foreignKey: 'periodId' },
  };

  @field('periodId') periodId: number;
  @field('points') points: number;
  @field('grade') grade: number;
  @field('beginDate') beginDate: string;
  @field('endDate') endDate: string;
  @field('attendanceId') attendanceId: string;

  @relation('attendance', 'attendanceId') attendance: Attendance;
  @children('absences') absences: Query<Absence>;
  @children('exclusions') exclusions: Query<Exclusion>;
}

export class Absence extends Model {
  static table = "absences";

  static associations = {
    attendance_periods: { type: 'belongs_to', key: 'periodId' },
  };

  @field('slotId') slotId: number;
  @field('startDate') startDate: string;
  @field('subjectName') subjectName: string;
  @field('justificatory') justificatory: string;
  @field('mandatory') mandatory: boolean;
  @field('periodId') periodId: string;

  @relation('attendance_periods', 'periodId') period: AttendancePeriod;
}

export class Exclusion extends Model {
  static table = "exclusions";

  static associations = {
    attendance_periods: { type: 'belongs_to', key: 'periodId' },
  };

  @field('periodId') periodId: string;
  @relation('attendance_periods', 'periodId') period: AttendancePeriod;
}