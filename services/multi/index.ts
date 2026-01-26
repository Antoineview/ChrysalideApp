import { Multi as EsupMulti } from "esup-multi.js";

import { Auth, Services } from "@/stores/account/types";
import { error } from "@/utils/logger/logger";

import AurigaAPI, { extractSubjectCode } from "../auriga";
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

  constructor(public accountId: string) { }

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
      // Extract subject code from grade name (everything after _SXX_)
      // Grade format: [UE]_[PARCOURS?]_[ECUE]_[EXAM]_[INDEX?]
      // Examples:
      //   - Bachelor: MIA_IGM_EXA
      //   - Ingénieur: CN_PC_PSE_EXA_1
      const gradeFullCode = extractSubjectCode(g.name);

      // Find the UE code (first part of subject code)
      const ueCode = gradeFullCode.split("_")[0] || "OTHER";

      // Find matching syllabus using PREFIX matching
      // Syllabus format: [UE]_[PARCOURS?]_[ECUE] (no exam suffix)
      // Examples:
      //   - Bachelor syllabus: MIA_IGM
      //   - Ingénieur syllabus: CN_PC_PSE
      // Grade "MIA_IGM_EXA" should match syllabus "MIA_IGM" because it starts with it
      const matchingSyllabus = syllabusList.find(s => {
        const syllabusSubjectCode = extractSubjectCode(s.name);
        // Grade must start with syllabus code followed by underscore (to avoid partial matches)
        // e.g., "MIA_IGM_EXA" starts with "MIA_IGM_" ✓
        // e.g., "MIA_IGMA" would NOT match "MIA_IGM" (different subject)
        return (
          gradeFullCode.startsWith(syllabusSubjectCode + "_") ||
          gradeFullCode === syllabusSubjectCode // Exact match case
        );
      });

      console.log(
        `[UI Match] Grade "${gradeFullCode}" -> Matched: ${matchingSyllabus ? extractSubjectCode(matchingSyllabus.name) : "NONE"} (UE: ${ueCode})`
      );

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
        // Track UE code and syllabus coefficient separately
        (subjectsMap[subjectKey] as any)._ueCode = ueCode;
        (subjectsMap[subjectKey] as any)._syllabusCoeff = matchingSyllabus?.coeff;
      }

      const gradeItem: SharedGrade & { _gradeCode?: string } = {
        id: String(g.code),
        subjectId: subjectKey,
        subjectName: subjectName,
        description: description,
        givenAt: g.syncedAt ? new Date(g.syncedAt) : new Date(), // Use preserved sync date
        studentScore: { value: g.grade },
        outOf: { value: 20 },
        coefficient: coefficient,
        createdByAccount: this.accountId,
        alphaMark: g.alphaMark, // VA, NV for validation grades
        _gradeCode: gradeFullCode, // Store grade code pattern for rattrapage matching
      };

      subjectsMap[subjectKey].grades?.push(gradeItem);
    });

    // Calculate weighted averages per subject, handling VA/NV grades and rattrapage
    Object.values(subjectsMap).forEach(s => {
      const sGrades = s.grades || [];

      // Handle rattrapage (EXF) replacing original exam (EXA) if better
      // Group grades by their base exam type (EXA_1, EXA, etc.)
      const gradesByExam: Record<string, SharedGrade[]> = {};
      sGrades.forEach(grade => {
        // Use stored grade code pattern for exam type detection
        const gradeCode = (grade as any)._gradeCode || '';
        // Extract exam type from description (e.g., "Examen Final" -> EXF, "Examen" -> EXA)
        const isRattrapage = grade.description?.toLowerCase().includes('rattrapage') ||
          gradeCode.includes('_EXF') || gradeCode.includes('_EXF_');
        const isExam = grade.description?.toLowerCase().includes('examen') ||
          gradeCode.includes('_EXA') || gradeCode.includes('_EXA_');

        if (isRattrapage || isExam) {
          // Extract base exam identifier (e.g., "EXA_1" -> "EXA_1", "EXF_1" -> "EXA_1")
          const examMatch = gradeCode.match(/_EX[AF](_\d+)?$/);
          const baseExam = examMatch ? examMatch[0].replace('_EXF', '_EXA') : '_EXA';

          if (!gradesByExam[baseExam]) {
            gradesByExam[baseExam] = [];
          }
          gradesByExam[baseExam].push(grade);
        } else {
          // Non-exam grade, use unique key
          gradesByExam[grade.id] = [grade];
        }
      });

      // For each exam group, keep only the best grade
      const effectiveGrades: SharedGrade[] = [];
      Object.values(gradesByExam).forEach(examGrades => {
        if (examGrades.length === 1) {
          effectiveGrades.push(examGrades[0]);
        } else {
          // Multiple grades (e.g., EXA and EXF) - keep the best one
          const bestGrade = examGrades.reduce((best, current) => {
            const bestScore = best.studentScore?.value ?? 0;
            const currentScore = current.studentScore?.value ?? 0;
            return currentScore > bestScore ? current : best;
          });
          effectiveGrades.push(bestGrade);
        }
      });

      let totalWeightedScore = 0;
      let totalWeight = 0;
      let allValidation = true; // True if all grades are VA/NV
      let hasNV = false; // True if any grade is NV

      effectiveGrades.forEach(grade => {
        if (grade.alphaMark) {
          // This is a validation grade (VA/NV)
          if (grade.alphaMark === "NV") {
            hasNV = true;
          }
          // Don't include in numeric average
        } else {
          // Numeric grade - include in average
          allValidation = false;
          const score = grade.studentScore?.value || 0;
          const weight = grade.coefficient || 1;
          totalWeightedScore += score * weight;
          totalWeight += weight;
        }
      });

      // Mark subject properties
      s.isValidationOnly = sGrades.length > 0 && allValidation;
      s.hasNonValidated = hasNV;

      // Calculate average (only for non-validation subjects)
      if (s.isValidationOnly) {
        s.studentAverage = { value: 0, outOf: 20 };
      } else {
        s.studentAverage = {
          value: totalWeight > 0 ? totalWeightedScore / totalWeight : 0,
          outOf: 20,
        };
      }
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
        // Check if any subject has NV (Non validé)
        const hasNV = ueSubjects.some(s => s.hasNonValidated);

        // Check if all subjects are validation-only
        const allValidationOnly = ueSubjects.every(s => s.isValidationOnly);

        // Calculate UE average using weighted coefficients from syllabus
        const numericSubjects = ueSubjects.filter(s => !s.isValidationOnly);

        // Use syllabus coefficients for weighted average calculation
        let ueWeightedTotal = 0;
        let ueTotalWeight = 0;

        numericSubjects.forEach(s => {
          const syllabusCoeff = (s as any)._syllabusCoeff;
          const weight = syllabusCoeff !== undefined ? syllabusCoeff : 1;
          ueWeightedTotal += (s.studentAverage?.value || 0) * weight;
          ueTotalWeight += weight;
        });

        const ueAverage = ueTotalWeight > 0 ? ueWeightedTotal / ueTotalWeight : 0;

        const ueNames: Record<string, string> = {
          PR: "Produire",
          AG: "Agir",
          CN: "Concevoir",
          PROJET: "Projet",
          PI: "Piloter",
        };

        return {
          id: ueCode,
          name: ueNames[ueCode] || ueCode,
          studentAverage: { value: ueAverage, outOf: 20 },
          classAverage: { value: 0 },
          outOf: { value: 20 },
          grades: [], // UE modules don't have direct grades
          subjects: ueSubjects, // Add nested subjects
          isValidationOnly: allValidationOnly,
          hasNonValidated: hasNV,
        };
      }
    );

    // Calculate overall average as mean of UE averages (excluding validation-only UEs)
    const numericModules = modules.filter(m => !m.isValidationOnly);
    const overallTotal = numericModules.reduce(
      (sum, m) => sum + (m.studentAverage?.value || 0),
      0
    );
    const overallAverage =
      numericModules.length > 0 ? overallTotal / numericModules.length : 0;

    return {
      studentOverall: { value: overallAverage, outOf: 20 },
      classAverage: { value: 0 },
      subjects: subjects,
      modules: modules, // UE groups for display
      createdByAccount: this.accountId,
    };
  }
}
