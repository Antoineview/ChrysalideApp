import { MMKV } from "react-native-mmkv";

import { addSubjectsToDatabase } from "@/database/useSubject";
import { useAccountStore } from "@/stores/account";
import { registerSubjectColor } from "@/utils/subjects/colors";
import { getSubjectEmoji } from "@/utils/subjects/emoji";
import { cleanSubjectName } from "@/utils/subjects/utils";

import {
  GRADES_PAYLOAD,
  SYLLABUS_PAYLOAD,
  SYLLABUS2_PAYLOAD,
} from "./payloads";
import { Grade, Syllabus, UserData } from "./types";

// Initialize MMKV storage
export const storage = new MMKV({
  id: "auriga-storage",
});

const BASE_URL = "https://auriga.epita.fr/api"; // Updated base URL to be cleaner

class AurigaAPI {
  private token: string | null = null;
  private cookie: string | null = null;

  constructor(token?: string) {
    if (token) {
      this.token = token;
    }
  }

  setToken(token: string) {
    this.token = token;
  }

  setCookie(cookie: string) {
    this.cookie = cookie;
  }

  /**
   * Initializes MMKV cache from WatermelonDB if empty.
   * Should be called at app startup to restore persisted data.
   */
  async initializeFromDatabase() {
    const { getDatabaseInstance } = await import("@/database/DatabaseProvider");
    const { Grade } = await import("@/database/models/Grades");

    // Check if MMKV cache is empty
    const cachedGrades = storage.getString("auriga_grades");
    if (!cachedGrades || cachedGrades === "[]") {
      try {
        const db = getDatabaseInstance();
        const dbGrades = await db.get("grades").query().fetch();

        if (dbGrades.length > 0) {
          // Convert WatermelonDB records to Auriga Grade format
          const grades: Grade[] = dbGrades.map((g: any) => ({
            code: g.gradeId || g.id,
            type: g.description || "",
            name: g.subjectName || "",
            semester: 0, // Will be extracted from name
            grade: JSON.parse(g.studentScoreRaw || "{}").value || 0,
          }));

          storage.set("auriga_grades", JSON.stringify(grades));
          console.log(
            `Restored ${grades.length} grades from WatermelonDB to MMKV cache.`
          );
        }
      } catch (e) {
        console.warn("Failed to restore grades from WatermelonDB:", e);
      }
    }
  }

  /**
   * Syncs all data from Auriga (Grades, Syllabus) and stores it in local storage.
   */
  async sync() {
    console.log("Starting Auriga Sync...");

    let fetchedGrades: Grade[] = [];
    let fetchedSyllabus: Syllabus[] = [];

    // 1. Fetch Grades
    console.log("Fetching Grades...");
    try {
      fetchedGrades = await this.fetchAllGrades();
      // Only save to cache if we got valid data (prevents wiping cache on 401 errors)
      if (fetchedGrades.length > 0) {
        // Load existing cached grades to preserve syncedAt dates
        const existingCached = storage.getString("auriga_grades");
        const existingGrades: Grade[] = existingCached
          ? JSON.parse(existingCached)
          : [];

        // Create a map of existing grades by code for quick lookup
        const existingGradesMap = new Map<string, Grade>();
        existingGrades.forEach(g => existingGradesMap.set(g.code, g));

        // Preserve syncedAt dates for existing grades, set new date for new grades
        const now = Date.now();
        fetchedGrades = fetchedGrades.map(g => {
          const existing = existingGradesMap.get(g.code);
          return {
            ...g,
            syncedAt: existing?.syncedAt || now, // Preserve existing date or set new one
          };
        });

        storage.set("auriga_grades", JSON.stringify(fetchedGrades));
        console.log(`Fetched ${fetchedGrades.length} grades.`);
      } else {
        console.log("No grades fetched, keeping existing cache.");
        // Load existing cached grades instead
        const cached = storage.getString("auriga_grades");
        if (cached) {
          fetchedGrades = JSON.parse(cached);
        }
      }
    } catch (e) {
      console.error("Failed to fetch grades:", e);
      // Keep existing cache
      const cached = storage.getString("auriga_grades");
      if (cached) {
        fetchedGrades = JSON.parse(cached);
      }
    }

    // 2. Fetch Syllabus
    console.log("Fetching Syllabus...");
    try {
      fetchedSyllabus = await this.fetchAllSyllabus();
      // Only save to cache if we got valid data (prevents wiping cache on 401 errors)
      if (fetchedSyllabus.length > 0) {
        storage.set("auriga_syllabus", JSON.stringify(fetchedSyllabus));
        console.log(`Fetched ${fetchedSyllabus.length} syllabus items.`);
      } else {
        console.log("No syllabus fetched, keeping existing cache.");
        // Load existing cached syllabus instead
        const cached = storage.getString("auriga_syllabus");
        if (cached) {
          fetchedSyllabus = JSON.parse(cached);
        }
      }

      // Register syllabus items as subjects in the database
      const subjectsToAdd = fetchedSyllabus.map((s: Syllabus) => ({
        id: s.name || String(s.id),
        name: s.caption?.name || s.name || String(s.id),
        studentAverage: {
          value: s.grade ?? 0,
          disabled: s.grade === undefined,
        },
        classAverage: { value: 0, disabled: true },
        maximum: { value: 0, disabled: true },
        minimum: { value: 0, disabled: true },
        outOf: { value: 20 },
      }));

      await addSubjectsToDatabase(subjectsToAdd);
      console.log(`Registered ${fetchedSyllabus.length} subjects in database.`);

      // Register subjects in account store for customization UI
      const store = useAccountStore.getState();
      for (const s of fetchedSyllabus) {
        const subjectName = s.caption?.name || s.name || String(s.id);
        const cleanedName = cleanSubjectName(subjectName);

        // Register color (will be generated if not exists)
        registerSubjectColor(subjectName);

        // Get emoji (from subject format or default)
        const emoji = getSubjectEmoji(subjectName);

        // Set all three properties in account store
        store.setSubjectName(cleanedName, subjectName);
        store.setSubjectEmoji(cleanedName, emoji);
      }
      console.log(
        `Registered ${fetchedSyllabus.length} subjects in customization store.`
      );
    } catch (e) {
      console.error("Failed to fetch syllabus:", e);
    }

    // 3. Match grades to subjects and save to database
    console.log("Matching grades with subjects...");
    try {
      const { addGradesToDatabase } = await import("@/database/useGrades");

      // Create a map for fast grade lookup by name
      const gradesMap = new Map<string, Grade>();
      fetchedGrades.forEach(g => gradesMap.set(g.name, g));

      // Process each syllabus and find matching grades using the algorithm
      for (const syllabus of fetchedSyllabus) {
        // syllabus.name now contains the proper code (e.g., "2526_I_INF_FISE_S03_CN_PC_AL")
        const syllabusCode = syllabus.name;

        const displayName =
          syllabus.caption?.name || syllabus.name || String(syllabus.id);

        // Count exams per type to determine if we need index suffix
        const examTypeCount = new Map<string, number>();
        for (const exam of syllabus.exams || []) {
          examTypeCount.set(exam.type, (examTypeCount.get(exam.type) || 0) + 1);
        }

        const gradesToSave = [];

        // For each exam in syllabus, construct key and find matching grade
        for (const exam of syllabus.exams || []) {
          // Determine the key pattern based on exam count
          const typeCount = examTypeCount.get(exam.type) || 1;
          let targetKey: string;
          if (typeCount === 1) {
            // Only one exam of this type: key = [Syllabus_Code]_[Exam_Type]
            targetKey = `${syllabusCode}_${exam.type}`;
          } else {
            // Multiple exams of this type: key = [Syllabus_Code]_[Exam_Type]_[Index]
            targetKey = `${syllabusCode}_${exam.type}_${exam.index}`;
          }

          const matchedGrade = gradesMap.get(targetKey);
          if (!matchedGrade) {
            continue;
          }

          // Build description from exam metadata
          const rawDesc =
            typeof exam.description === "string"
              ? exam.description
              : exam.description?.fr || exam.description?.en;
          const description =
            rawDesc && exam.typeName
              ? `${exam.typeName} - ${rawDesc}`
              : rawDesc || exam.typeName || exam.type || "";

          gradesToSave.push({
            id: matchedGrade.code,
            createdByAccount: "auriga",
            subjectId: syllabusCode,
            subjectName: displayName,
            description,
            givenAt: matchedGrade.syncedAt
              ? new Date(matchedGrade.syncedAt)
              : new Date(),
            outOf: { value: 20 },
            coefficient: exam.weighting ? exam.weighting / 100 : 1,
            studentScore: { value: matchedGrade.grade },
            averageScore: { value: 0, disabled: true },
            minScore: { value: 0, disabled: true },
            maxScore: { value: 0, disabled: true },
          });
        }

        if (gradesToSave.length > 0) {
          await addGradesToDatabase(gradesToSave, displayName);
        }
      }
      console.log(`Matched and saved grades to subjects.`);
    } catch (e) {
      console.error("Failed to match grades with subjects:", e);
    }

    return {
      grades: this.getAllGrades(),
      syllabus: this.getAllSyllabus(),
      userData: null,
    };
  }

  // --- Getters (from Storage) ---

  getStudentData(): UserData | null {
    const data = storage.getString("auriga_userdata");
    return data ? JSON.parse(data) : null;
  }

  getAllGrades(): Grade[] {
    const data = storage.getString("auriga_grades");
    return data ? JSON.parse(data) : [];
  }

  getGradeByCode(code: string): Grade | undefined {
    return this.getAllGrades().find(g => g.code.toString() === code);
  }

  /**
   * Returns grades enriched with syllabus exam descriptions and weightings.
   * Uses the algorithm: [Syllabus_Code]_[Exam_Type]_[Index] for multi-exam types,
   * or [Syllabus_Code]_[Exam_Type] when only one exam of that type exists.
   */
  getEnrichedGrades(): (Grade & { description: string; weighting: number })[] {
    const allGrades = this.getAllGrades();
    const syllabusList = this.getAllSyllabus();

    // Build a lookup map from grade name to exam metadata
    const examMetadataMap = new Map<
      string,
      { description: string; weighting: number }
    >();

    for (const syllabus of syllabusList) {
      // syllabus.name now contains the proper code (e.g., "2526_I_INF_FISE_S03_CN_PC_AL")
      const syllabusCode = syllabus.name;

      // Count exams per type to determine if we need index suffix
      const examTypeCount = new Map<string, number>();
      for (const exam of syllabus.exams || []) {
        examTypeCount.set(exam.type, (examTypeCount.get(exam.type) || 0) + 1);
      }

      for (const exam of syllabus.exams || []) {
        // Build description
        const examDescription =
          typeof exam.description === "string"
            ? exam.description
            : exam.description?.fr || exam.description?.en;

        let description = exam.typeName || exam.type || "";
        if (examDescription && exam.typeName) {
          description = `${exam.typeName} - ${examDescription}`;
        } else if (examDescription) {
          description = examDescription;
        }

        const metadata = { description, weighting: exam.weighting ?? 1 };

        // Determine the key pattern based on exam count
        const typeCount = examTypeCount.get(exam.type) || 1;
        if (typeCount === 1) {
          // Only one exam of this type: key = [Syllabus_Code]_[Exam_Type]
          const targetKey = `${syllabusCode}_${exam.type}`;
          examMetadataMap.set(targetKey, metadata);
        } else {
          // Multiple exams of this type: key = [Syllabus_Code]_[Exam_Type]_[Index]
          const targetKey = `${syllabusCode}_${exam.type}_${exam.index}`;
          examMetadataMap.set(targetKey, metadata);
        }
      }
    }

    // Enrich each grade with metadata from matching exam
    return allGrades.map(g => {
      const metadata = examMetadataMap.get(g.name);

      if (metadata) {
        return {
          ...g,
          description: metadata.description,
          weighting: metadata.weighting,
        };
      }

      // Fallback: no exact match found, use grade's own type/name
      return {
        ...g,
        description: g.type || g.name,
        weighting: 1,
      };
    });
  }

  getAllSyllabus(): Syllabus[] {
    const data = storage.getString("auriga_syllabus");
    return data ? JSON.parse(data) : [];
  }

  getSyllabusBySemester(semester: number): Syllabus[] {
    return this.getAllSyllabus().filter(s => s.semester === semester);
  }

  // --- Fetch Implementation ---

  /**
   * Fetches the access token using the session cookies.
   */
  async fetchToken(): Promise<string | null> {
    try {
      // Try /api/token as the likely candidate
      const tokenUrl = "https://auriga.epita.fr/api/token";

      const headers: any = {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        Origin: "https://auriga.epita.fr",
        Referer: "https://auriga.epita.fr/",
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1", // Mock User Agent
      };

      if (this.cookie) {
        headers["Cookie"] = this.cookie;

        // XSRF Protection: Extract XSRF-TOKEN and send as X-XSRF-TOKEN header
        const xsrfMatch = this.cookie.match(/XSRF-TOKEN=([^;]+)/);
        if (xsrfMatch) {
          headers["X-XSRF-TOKEN"] = xsrfMatch[1];
          console.log("Added X-XSRF-TOKEN header");
        }
      }

      const response = await fetch(tokenUrl, {
        method: "GET",
        headers: headers,
      });

      if (!response.ok) {
        console.error(`Failed to fetch token: ${response.status}`);
        const text = await response.text();
        console.error(`Token response: ${text.substring(0, 500)}`);
        return null;
      }

      const data = await response.json();
      if (data && data.access_token) {
        console.log("Successfully fetched access token!");
        this.token = data.access_token;
        return data.access_token;
      }

      return null;
    } catch (error) {
      console.error("Error fetching token:", error);
      return null;
    }
  }

  private async postDataToAuriga(endpoint: string, payload: any) {
    const headers: any = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: "https://auriga.epita.fr",
      Referer: "https://auriga.epita.fr/",
      "X-Requested-With": "XMLHttpRequest",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    if (this.cookie) {
      headers["Cookie"] = this.cookie;
      // XSRF Protection for POST requests too
      const xsrfMatch = this.cookie.match(/XSRF-TOKEN=([^;]+)/);
      if (xsrfMatch) {
        headers["X-XSRF-TOKEN"] = xsrfMatch[1];
      }
    }

    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok || (contentType && contentType.includes("text/html"))) {
      const text = await response.text();
      console.error(
        `Auriga API Error [${endpoint}] (${response.status}):`,
        text.substring(0, 200)
      );
      throw new Error(`Auriga API Error (${response.status}) on ${endpoint}`);
    }

    return await response.json();
  }

  // Using User's endpoints from their code snippet
  private async fetchAllGrades(): Promise<Grade[]> {
    try {
      const allGrades: Grade[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const endpoint = `menuEntries/1036/searchResult?size=100&page=${page}&sort=id&disableWarnings=true`;
        console.log(`Fetching Grades Page ${page}...`);

        const response = await this.postDataToAuriga(endpoint, GRADES_PAYLOAD);

        if (response && response.totalPages) {
          totalPages = response.totalPages;
        }

        const lines = response?.content?.lines || [];

        lines.forEach((row: any) => {
          if (!Array.isArray(row) || row.length < 5) {
            return;
          }

          const gradeValue = row[1];
          const itemCode = row[0];
          const itemName = row[2];
          const typeName = row[4];

          let semester = 0;
          // Extract semester from name (e.g. "..._S5_...")
          if (typeof itemName === "string") {
            const match = itemName.match(/_S(\d+)_/i);
            if (match) {
              semester = parseInt(match[1]);
            }
          }

          if (gradeValue !== null && gradeValue !== undefined) {
            allGrades.push({
              code: String(itemCode),
              type: String(typeName),
              name: String(itemName),
              semester: semester,
              grade: Number(String(gradeValue).replace(",", ".")) || 0,
            });
          }
        });

        page++;
      } while (page <= totalPages);

      return allGrades;
    } catch (e) {
      console.warn("Grades fetch failed:", e);
      return [];
    }
  }

  private async fetchAllSyllabus(): Promise<Syllabus[]> {
    // User code fetches: menuEntries/166/searchResult?size=100&page=1&sort=id
    // With TWO payloads (SYLLABUS and SYLLABUS2)
    // Then fetches INDIVIDUAL syllabuses via `menuEntries/166/syllabuses/${element}`

    // This is much more complex than a simple list fetch.
    // Use the User's endpoint to get the ID list.

    // 1. Get List of IDs
    const entryUrl = "menuEntries/166/searchResult?size=100&page=1&sort=id";
    let allIds: string[] = [];

    try {
      const ids1 = await this.postDataToAuriga(entryUrl, SYLLABUS_PAYLOAD);
      const ids2 = await this.postDataToAuriga(entryUrl, SYLLABUS2_PAYLOAD);

      const extractIds = (res: any) =>
        res?.content?.lines?.map((l: any) => l[0]) || [];

      allIds = [...new Set([...extractIds(ids1), ...extractIds(ids2)])];
      console.log(`Found ${allIds.length} syllabus IDs. Fetching details...`);
    } catch (e) {
      console.error(
        "Failed to fetch syllabus IDs (skipping syllabus sync):",
        e
      );
      return [];
    }

    // 2. Fetch Details for each ID

    // Let's try to fetch all, but maybe in parallel batches.

    const syllabusDetails: Syllabus[] = [];

    // We can't do too many parallel requests or we might get rate limited/blocked.
    // Let's do batches of 5.
    const BATCH_SIZE = 5;
    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batch = allIds.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (id: string) => {
          try {
            // User endpoint: `menuEntries/166/syllabuses/${element}` (GET)
            // BUT my postData is POST. Need a GET helper.
            const endpoint = `menuEntries/166/syllabuses/${id}`;

            // Assuming we use the same headers logic for GET
            const detailRes = await this.getDataFromAuriga(endpoint);
            const mapped = this.mapSyllabusDetail(detailRes);
            if (mapped) {
              syllabusDetails.push(mapped);
            }
          } catch (e) {
            console.warn(`Failed to fetch syllabus ${id}:`, e);
          }
        })
      );
    }

    return syllabusDetails;
  }

  private async getDataFromAuriga(endpoint: string) {
    const headers: any = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: "https://auriga.epita.fr",
      Referer: "https://auriga.epita.fr/",
      "X-Requested-With": "XMLHttpRequest",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    if (this.cookie) {
      headers["Cookie"] = this.cookie;
    }

    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }
    return await response.json();
  }

  private mapSyllabusDetail(row: any): Syllabus | null {
    // User mapping logic:
    // UE: String(element.documents[0].fileName).split("_")[5],
    // ...
    if (!row) {
      return null;
    }

    try {
      const fileName = row.documents?.[0]?.fileName || "";
      // Use row.code as the syllabus code - this is what grade names use for matching
      // Example: "2526_I_INF_FISE_S03_CN_PC_AL" (from row.code)
      // vs fileName: "2526_I_INF_FISE_S03_CN_PC_AL_FR" (includes language suffix)
      const syllabusCode = row.code || fileName.replace(/_(FR|EN)$/, "");

      return {
        id: row.id,
        UE: fileName.split("_")[5] || "Unknown",
        semester: fileName.split("_")[4]?.replace("S", "")
          ? parseInt(fileName.split("_")[4].replace("S", ""))
          : 0,
        name: syllabusCode, // Use the proper syllabus code for matching
        code: row.field?.code, // This is the field/subject area code
        minScore: row.customAttributes?.miniScore,
        duration: row.duration,
        period: {
          startDate: row.period?.startDate,
          endDate: row.period?.endDate,
        },
        exams:
          row.syllabusAssessmentComponents?.map((e: any, i: number) => ({
            id: e.id,
            index: e.index ?? i + 1, // Use component's index or 1-based array position
            description: e.description,
            type: e.examType?.code,
            typeName: e.examType?.caption?.fr,
            weighting: e.weighting,
          })) || [],
        courseDescription: {
          coursPlan: row.customAttributes?.CoursePlan, // Program
          expected: [],
        },
        caption: {
          name: row.caption?.fr,
          goals: row.outline?.fr ? { fr: row.outline.fr } : {},
          program: row.learningOutcome?.fr
            ? { fr: row.learningOutcome.fr }
            : {},
        },
        responsables:
          row.syllabusResponsibles?.map((r: any) => ({
            uid: r.person?.id,
            login: r.person?.customAttributes?.LOGIN,
            firstName: r.person?.currentFirstName,
            lastName: r.person?.currentLastName,
          })) || [],
        instructorsValidator: [],
        instructorsEditors: [],
        activities:
          row.syllabusActivityTypes?.map((a: any) => ({
            id: a.id,
            type: a.activityType?.code,
            typeName: a.activityType?.caption?.fr,
            duration: a.duration,
          })) || [],
        locations:
          row.syllabusSites?.map((s: any) => ({
            code: s.site?.code,
            name: s.site?.caption?.fr,
          })) || [],
      };
    } catch (e) {
      console.log("Error mapping syllabus:", e);
      return null;
    }
  }
}

export default new AurigaAPI();
