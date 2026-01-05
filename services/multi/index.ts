import { Multi as EsupMulti } from "esup-multi.js";

import { Auth, Services } from "@/stores/account/types";
import { error } from "@/utils/logger/logger";

import AurigaAPI from "../auriga";
import {
  Grade as SharedGrade,
  Period,
  PeriodGrades,
  Subject,
} from "../shared/grade";
import { News } from "../shared/news";
import { CourseDay } from "../shared/timetable";
import { Capabilities, SchoolServicePlugin } from "../shared/types";
import { fetchMultiNews } from "./news";
import { refreshMultiSession } from "./refresh";
import { fetchMultiTimetable } from "./timetable";

export class Multi implements SchoolServicePlugin {
  displayName = "Multi";
  service = Services.MULTI;
  capabilities: Capabilities[] = [
    Capabilities.REFRESH,
    Capabilities.NEWS,
    Capabilities.TIMETABLE,
  ];
  session: EsupMulti | undefined = undefined;
  authData: Auth = {};

  // Track if this is an Auriga account
  private isAuriga = false;

  constructor(public accountId: string) {}

  async refreshAccount(credentials: Auth): Promise<Multi> {
    const refresh = await refreshMultiSession(this.accountId, credentials);

    this.authData = refresh.auth;
    this.session = refresh.session;

    if (credentials.additionals?.type === "auriga") {
      this.isAuriga = true;
      this.capabilities = [Capabilities.REFRESH, Capabilities.GRADES];

      if (credentials.accessToken) {
        AurigaAPI.setToken(credentials.accessToken);
      }
      if (
        credentials.additionals.cookies &&
        typeof credentials.additionals.cookies === "string"
      ) {
        AurigaAPI.setCookie(credentials.additionals.cookies);
      }

      await AurigaAPI.sync();
    }

    return this;
  }

  async getNews(): Promise<News[]> {
    if (this.isAuriga) {
      return [];
    }
    if (this.session) {
      return fetchMultiNews(this.session, this.accountId);
    }
    error("Session is not valid", "Multi.getNews");
    throw new Error("Session is not valid");
  }

  async getWeeklyTimetable(weekNumber: number): Promise<CourseDay[]> {
    if (this.isAuriga) {
      return [];
    }
    if (this.session) {
      return fetchMultiTimetable(this.session, this.accountId, weekNumber);
    }
    error("Session is not valid", "Multi.getWeeklyTimetable");
    throw new Error("Session is not valid");
  }

  // --- Auriga Specific Implementations ---

  async getGradesPeriods(): Promise<Period[]> {
    if (!this.isAuriga) {
      return [];
    }

    const grades = AurigaAPI.getAllGrades();
    const semesters = Array.from(
      new Set(grades.map(g => g.semester).filter(s => s > 0))
    ).sort((a, b) => b - a);

    return semesters.map(s => ({
      id: `S${s}`,
      name: `Semestre ${s}`,
      start: new Date(),
      end: new Date(),
      createdByAccount: this.accountId,
    }));
  }

  async getGradesForPeriod(period: Period): Promise<PeriodGrades> {
    if (!this.isAuriga) {
      return {
        studentOverall: { value: 0 },
        classAverage: { value: 0 },
        subjects: [],
        createdByAccount: this.accountId,
      };
    }

    const semesterNum = period.id ? parseInt(period.id.replace("S", "")) : 0;
    const enrichedGrades = AurigaAPI.getEnrichedGrades().filter(
      g => g.semester === semesterNum
    );
    const syllabusList = AurigaAPI.getAllSyllabus();

    const subjectsMap: Record<string, Subject> = {};

    // For each grade, find matching syllabus and group by syllabus display name
    enrichedGrades.forEach(g => {
      // Extract UE+[parcours]+subject code from grade name
      // Format: 2526_I_INF_FISE_S03_CN_PC_PSE_EXA_1 -> extract "CN_PC_PSE"
      // Format: 2526_I_INF_FISE_S03_AG_COM3_EXA_1 -> extract "AG_COM3"
      // Structure: [prefix 5 parts]_[UE]_[optional PC/PA]_[SUBJECT]_[TYPE]_[NUM]
      const gradeNameParts = g.name.split("_");

      // Find the UE code: first 2-letter code after the 5-part prefix (index 5)
      // The UE is always at position 5 (index 5)
      const ueIndex = 5;
      const ueCode = gradeNameParts[ueIndex] || "OTHER";

      // Check if next part after UE is PC or PA (parcours)
      const hasParcours =
        gradeNameParts[ueIndex + 1] === "PC" ||
        gradeNameParts[ueIndex + 1] === "PA";

      // Build the match code: UE + (optional parcours) + SUBJECT
      let gradeSubjectCode = "";
      if (hasParcours) {
        // Format: UE_PC_SUBJECT (e.g., CN_PC_PSE)
        gradeSubjectCode = `${gradeNameParts[ueIndex]}_${gradeNameParts[ueIndex + 1]}_${gradeNameParts[ueIndex + 2]}`;
      } else {
        // Format: UE_SUBJECT (e.g., AG_COM3)
        gradeSubjectCode = `${gradeNameParts[ueIndex]}_${gradeNameParts[ueIndex + 1]}`;
      }

      // Find matching syllabus by checking if it contains the same subject code
      const matchingSyllabus = syllabusList.find(s => {
        const syllabusName = s.name.replace(/\.[^.]+$/, ""); // Remove file extension
        return gradeSubjectCode && syllabusName.includes(gradeSubjectCode);
      });

      // Use syllabus display name if found, otherwise fall back to grade name
      const subjectName =
        matchingSyllabus?.caption?.name ||
        matchingSyllabus?.name?.replace(/\.[^.]+$/, "") || // Remove extension
        g.name;

      // Create unique key combining UE and subject name for proper grouping
      const subjectKey = `${ueCode}_${subjectName}`;

      // Use the grade's type field directly (e.g., "EXA", "CC", "TP")
      const examType = g.type || "";
      let description = examType || "Note";
      let coefficient = 1; // Default coefficient (100%)

      if (matchingSyllabus) {
        // Extract exam part from name for description
        const syllabusCode = matchingSyllabus.name;
        const examPart = g.name.replace(syllabusCode + "_", "");

        // Parse exam type and index from examPart (e.g., "EXA_1" or "EXF")
        const examPartParts = examPart.split("_");
        const examTypeFromPart = examPartParts[0];
        const examIndexFromPart = examPartParts[1]
          ? parseInt(examPartParts[1], 10)
          : undefined;

        // Count exams per type to determine matching pattern
        const examTypeCount: Record<string, number> = {};
        matchingSyllabus.exams?.forEach(e => {
          examTypeCount[e.type] = (examTypeCount[e.type] || 0) + 1;
        });

        // Find matching exam using the correct pattern
        const matchingExam = matchingSyllabus.exams?.find(e => {
          if (e.type !== examTypeFromPart) {
            return false;
          }

          const typeCount = examTypeCount[e.type] || 1;
          if (typeCount === 1) {
            // Single exam of this type - matches if type matches
            return true;
          }
          // Multiple exams of this type - match by index
          return e.index === examIndexFromPart;
        });

        // Use the syllabus exam's typeName for description if available
        if (matchingExam) {
          const examDescription =
            typeof matchingExam.description === "string"
              ? matchingExam.description
              : matchingExam.description?.fr || matchingExam.description?.en;

          if (examDescription && matchingExam.typeName) {
            // Combine typeName and description
            description = `${matchingExam.typeName} - ${examDescription}`;
          } else if (examDescription) {
            description = examDescription;
          } else if (matchingExam.typeName) {
            description = matchingExam.typeName;
          } else if (examPart) {
            description = examPart.replace(/_/g, " ");
          }
        } else if (examPart) {
          description = examPart.replace(/_/g, " ");
        }

        if (matchingExam && matchingExam.weighting) {
          // Convert percentage to decimal (e.g., 30 -> 0.30)
          coefficient = matchingExam.weighting / 100;
        }
      }

      // Store UE code with subject for later grouping
      if (!subjectsMap[subjectKey]) {
        subjectsMap[subjectKey] = {
          id: subjectKey,
          name: subjectName,
          studentAverage: { value: 0 },
          classAverage: { value: 0 },
          outOf: { value: 20 },
          grades: [],
        };
        // Track UE code separately since Subject interface doesn't have it
        (subjectsMap[subjectKey] as any)._ueCode = ueCode;
      }

      const gradeItem: SharedGrade = {
        id: String(g.code),
        subjectId: subjectKey,
        subjectName: subjectName,
        description: description,
        givenAt: g.syncedAt ? new Date(g.syncedAt) : new Date(), // Use preserved sync date
        studentScore: { value: g.grade },
        outOf: { value: 20 },
        coefficient: coefficient,
        createdByAccount: this.accountId,
      };

      subjectsMap[subjectKey].grades?.push(gradeItem);
    });

    // Calculate weighted averages per subject
    Object.values(subjectsMap).forEach(s => {
      const sGrades = s.grades || [];
      let totalWeightedScore = 0;
      let totalWeight = 0;

      sGrades.forEach(grade => {
        const score = grade.studentScore?.value || 0;
        const weight = grade.coefficient || 1;
        totalWeightedScore += score * weight;
        totalWeight += weight;
      });

      s.studentAverage = {
        value: totalWeight > 0 ? totalWeightedScore / totalWeight : 0,
        outOf: 20,
      };
    });

    const subjects = Object.values(subjectsMap);

    // Group subjects by UE code
    const ueGroups: Record<string, Subject[]> = {};
    subjects.forEach(s => {
      const ueCode = (s as any)._ueCode || "OTHER";
      if (!ueGroups[ueCode]) {
        ueGroups[ueCode] = [];
      }
      ueGroups[ueCode].push(s);
    });

    // Create UE modules with averages
    const modules: Subject[] = Object.entries(ueGroups).map(
      ([ueCode, ueSubjects]) => {
        // Calculate UE average as mean of subject averages (all subjects weight 1)
        const ueTotal = ueSubjects.reduce(
          (sum, s) => sum + (s.studentAverage?.value || 0),
          0
        );
        const ueAverage =
          ueSubjects.length > 0 ? ueTotal / ueSubjects.length : 0;

        return {
          id: ueCode,
          name: ueCode,
          studentAverage: { value: ueAverage, outOf: 20 },
          classAverage: { value: 0 },
          outOf: { value: 20 },
          grades: [], // UE modules don't have direct grades
          subjects: ueSubjects, // Add nested subjects
        };
      }
    );

    // Calculate overall average as mean of UE averages (each UE coef 1)
    const overallTotal = modules.reduce(
      (sum, m) => sum + (m.studentAverage?.value || 0),
      0
    );
    const overallAverage =
      modules.length > 0 ? overallTotal / modules.length : 0;

    return {
      studentOverall: { value: overallAverage, outOf: 20 },
      classAverage: { value: 0 },
      subjects: subjects,
      modules: modules, // UE groups for display
      createdByAccount: this.accountId,
    };
  }
}
