import { MMKV } from "react-native-mmkv";

import { addSubjectsToDatabase } from "@/database/useSubject";
import { useAccountStore } from "@/stores/account";
import { registerSubjectColor } from "@/utils/subjects/colors";
import { getSubjectEmoji } from "@/utils/subjects/emoji";
import { cleanSubjectName } from "@/utils/subjects/utils";

import { GRADES_PAYLOAD, SYLLABUS_PAYLOAD } from "./payloads";
import { Grade, Syllabus, UserData } from "./types";

// Initialize MMKV storage
export const storage = new MMKV({
  id: "auriga-storage",
});

/**
 * Extracts the stable subject code from a grade/syllabus name.
 * Pattern: YYYY_[SECTION]_[...]_SXX_[SUBJECT_CODE]
 * Returns everything after the _SXX_ pattern.
 * Examples:
 *   - "2526_B_CYBER_S03_MIA_IGM" -> "MIA_IGM"
 *   - "2526_I_INF_FISE_S03_CN_PC_AL" -> "CN_PC_AL"
 */
export function extractSubjectCode(name: string): string {
  const match = name.match(/_S\d{2}_(.+)$/);
  return match ? match[1] : name;
}

/**
 * Checks if a name indicates a Bachelor section account.
 * Bachelor accounts have _B_ after the year prefix.
 */
export function isBachelorSection(name: string): boolean {
  return /^\d{4}_B_/.test(name);
}

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
   * @param onLog Optional callback to receive log messages during sync (for UI display)
   */
  async sync(onLog?: (message: string) => void) {
    const log = (msg: string) => {
      console.log(msg);
      if (onLog) {
        onLog(msg);
      }
    };

    log("🚀 Starting Auriga Sync...");

    let fetchedGrades: Grade[] = [];
    let fetchedSyllabus: Syllabus[] = [];

    // 1. Fetch Grades
    log("📊 Fetching Grades...");
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
        log(`✅ Fetched ${fetchedGrades.length} grades.`);
      } else {
        log("⚠️ No grades fetched, keeping existing cache.");
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
    log("📚 Fetching Syllabus...");
    try {
      fetchedSyllabus = await this.fetchAllSyllabus();
      // Only save to cache if we got valid data (prevents wiping cache on 401 errors)
      if (fetchedSyllabus.length > 0) {
        storage.set("auriga_syllabus", JSON.stringify(fetchedSyllabus));
        log(`✅ Fetched ${fetchedSyllabus.length} syllabus items.`);
        // Log each syllabus for detailed visibility
        for (const s of fetchedSyllabus) {
          log(
            `[Syllabus] ${s.name} | UE: ${s.UE} | S${s.semester} | ${s.caption?.name || "No caption"}`
          );
        }
      } else {
        log("⚠️ No syllabus fetched, keeping existing cache.");
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
      log(`📝 Registered ${fetchedSyllabus.length} subjects in database.`);

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
      log(
        `🎨 Registered ${fetchedSyllabus.length} subjects in customization store.`
      );
    } catch (e) {
      console.error("Failed to fetch syllabus:", e);
    }

    // 3. Match grades to subjects and save to database
    log("🔗 Matching grades with subjects...");
    try {
      const { addGradesToDatabase } = await import("@/database/useGrades");

      // Build list of grade subject codes for prefix matching
      const gradeCodePairs: { code: string; grade: Grade }[] = [];
      log(`[Match] Building grade list from ${fetchedGrades.length} grades...`);
      fetchedGrades.forEach(g => {
        const gradeFullCode = extractSubjectCode(g.name);
        gradeCodePairs.push({ code: gradeFullCode, grade: g });
        log(`[Match] Grade: "${g.name}" -> Code: "${gradeFullCode}"`);
      });

      let totalMatched = 0;
      let totalUnmatched = 0;

      // Process each syllabus and find matching grades using PREFIX matching
      log(`[Match] Processing ${fetchedSyllabus.length} syllabi...`);
      for (const syllabus of fetchedSyllabus) {
        // Extract base subject code from syllabus name
        // Syllabus format: [UE]_[PARCOURS?]_[ECUE] (no exam suffix)
        const syllabusSubjectCode = extractSubjectCode(syllabus.name);
        log(
          `[Match] Syllabus: "${syllabus.name}" -> BaseCode: "${syllabusSubjectCode}"`
        );

        const displayName =
          syllabus.caption?.name || syllabus.name || String(syllabus.id);

        // Find ALL grades that match this syllabus using PREFIX matching
        // Grade "MIA_IGM_EXA" matches syllabus "MIA_IGM" because it starts with "MIA_IGM_"
        const matchingGrades = gradeCodePairs.filter(
          ({ code }) =>
            code.startsWith(syllabusSubjectCode + "_") ||
            code === syllabusSubjectCode
        );

        log(
          `[Match] Found ${matchingGrades.length} grades for syllabus "${syllabusSubjectCode}"`
        );

        const gradesToSave = [];

        for (const { code, grade } of matchingGrades) {
          // Extract exam part from the grade code (everything after syllabus code)
          const examPart = code.substring(syllabusSubjectCode.length + 1); // +1 for the underscore

          // Find matching exam in syllabus to get description and weighting
          const examParts = examPart.split("_");
          const examType = examParts[0];
          const examIndex = examParts[1]
            ? parseInt(examParts[1], 10)
            : undefined;

          const matchingExam = syllabus.exams?.find(e => {
            if (e.type !== examType) {
              return false;
            }
            // If index is specified in grade, match it; otherwise match by type only
            if (examIndex !== undefined) {
              return e.index === examIndex;
            }
            return true;
          });

          // Build description from exam metadata
          let description = examType || "Note";
          let coefficient = 1;

          if (matchingExam) {
            const rawDesc =
              typeof matchingExam.description === "string"
                ? matchingExam.description
                : matchingExam.description?.fr || matchingExam.description?.en;
            description =
              rawDesc && matchingExam.typeName
                ? `${matchingExam.typeName} - ${rawDesc}`
                : rawDesc || matchingExam.typeName || examType || "";
            coefficient = matchingExam.weighting
              ? matchingExam.weighting / 100
              : 1;
          }

          log(
            `[Match] ✅ Matched grade "${code}" -> Exam: ${examType}, Desc: "${description}"`
          );
          totalMatched++;

          gradesToSave.push({
            id: grade.code,
            createdByAccount: "auriga",
            subjectId: syllabus.name,
            subjectName: displayName,
            description,
            givenAt: grade.syncedAt ? new Date(grade.syncedAt) : new Date(),
            outOf: { value: 20 },
            coefficient,
            studentScore: { value: grade.grade },
            averageScore: { value: 0, disabled: true },
            minScore: { value: 0, disabled: true },
            maxScore: { value: 0, disabled: true },
          });
        }

        if (gradesToSave.length > 0) {
          log(
            `[Match] Saving ${gradesToSave.length} grades for "${displayName}"`
          );
          await addGradesToDatabase(gradesToSave, displayName);
        }
      }

      // Count unmatched grades
      const matchedGradeCodes = new Set<string>();
      for (const syllabus of fetchedSyllabus) {
        const syllabusCode = extractSubjectCode(syllabus.name);
        gradeCodePairs.forEach(({ code }) => {
          if (code.startsWith(syllabusCode + "_") || code === syllabusCode) {
            matchedGradeCodes.add(code);
          }
        });
      }
      totalUnmatched = gradeCodePairs.length - matchedGradeCodes.size;

      log(
        `✅ [Match] Complete: ${totalMatched} matched, ${totalUnmatched} grades unmatched`
      );
      log("🎉 Sync complete!");
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
   * Uses PREFIX MATCHING for year/semester-agnostic matching.
   */
  getEnrichedGrades(): (Grade & { description: string; weighting: number })[] {
    const allGrades = this.getAllGrades();
    const syllabusList = this.getAllSyllabus();

    // Enrich each grade by finding matching syllabus using prefix matching
    return allGrades.map(g => {
      // Extract full code from grade name (includes exam type and index)
      // e.g., MIA_IGM_EXA or CN_PC_PSE_EXA_1
      const gradeFullCode = extractSubjectCode(g.name);

      // Find matching syllabus using PREFIX matching
      // Grade "MIA_IGM_EXA" matches syllabus "MIA_IGM" because it starts with "MIA_IGM_"
      const matchingSyllabus = syllabusList.find(s => {
        const syllabusSubjectCode = extractSubjectCode(s.name);
        return (
          gradeFullCode.startsWith(syllabusSubjectCode + "_") ||
          gradeFullCode === syllabusSubjectCode
        );
      });

      if (matchingSyllabus) {
        const syllabusSubjectCode = extractSubjectCode(matchingSyllabus.name);
        // Extract exam part from grade code
        const examPart = gradeFullCode.substring(
          syllabusSubjectCode.length + 1
        );
        const examParts = examPart.split("_");
        const examType = examParts[0];
        const examIndex = examParts[1] ? parseInt(examParts[1], 10) : undefined;

        // Find matching exam in syllabus
        const matchingExam = matchingSyllabus.exams?.find(e => {
          if (e.type !== examType) {
            return false;
          }
          if (examIndex !== undefined) {
            return e.index === examIndex;
          }
          return true;
        });

        if (matchingExam) {
          const examDescription =
            typeof matchingExam.description === "string"
              ? matchingExam.description
              : matchingExam.description?.fr || matchingExam.description?.en;

          let description = matchingExam.typeName || matchingExam.type || "";
          if (examDescription && matchingExam.typeName) {
            description = `${matchingExam.typeName} - ${examDescription}`;
          } else if (examDescription) {
            description = examDescription;
          }

          return {
            ...g,
            description,
            weighting: matchingExam.weighting ?? 1,
          };
        }
      }

      // Fallback: no match found, use grade's own type/name
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

          const gradeValue = row[1]; // Calculated field: numeric grade or alpha text
          const itemCode = row[0]; // Obligation ID (numeric)
          const itemName = row[2]; // Obligation code (string with semester info)
          const typeName = row[4]; // Exam type code

          let semester = 0;
          // Extract semester from code (e.g. "..._S03_...")
          // itemName contains the full grade code like 2526_I_INF_FISE_S03_...
          const codeStr = String(itemName);
          const match = codeStr.match(/_S(\d+)_/i);
          if (match) {
            semester = parseInt(match[1]);
          }

          if (gradeValue !== null && gradeValue !== undefined) {
            // Check if it's an alpha mark (VA, NV, Validé, Non validé)
            const gradeStr = String(gradeValue).trim();
            let alphaMark: string | undefined;
            let numericGrade = 0;

            if (gradeStr === "VA" || gradeStr === "Validé") {
              alphaMark = "VA";
            } else if (gradeStr === "NV" || gradeStr === "Non validé") {
              alphaMark = "NV";
            } else {
              // Parse as numeric grade
              numericGrade = Number(gradeStr.replace(",", ".")) || 0;
            }

            allGrades.push({
              code: String(itemCode), // Keep ID as code
              type: String(typeName),
              name: codeStr, // Use string code as name (for matching)
              semester: semester,
              grade: numericGrade,
              alphaMark: alphaMark,
            });
          }
        });

        console.log(
          `[Auriga] Page ${page} processed. Total grades so far: ${allGrades.length}`
        );

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
    // We use a more robust method: fetch catalog definitions first, then search for each catalog.
    // This allows us to get syllabuses from all available catalogs/years.
    let allIds: string[] = [];

    // Helper to request with strict headers matching the user's snippet
    const fetchWithToken = async (endpoint: string, method: "GET" | "POST", body?: any) => {
      if (!this.token) {
        throw new Error("No access token available for Auriga sync");
      }

      const headers: any = {
        "Authorization": "Bearer " + this.token
      };

      if (method === "POST") {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(`${BASE_URL}/${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const text = await response.text();
         throw new Error(`Auriga API Error ${response.status} on ${endpoint}: ${text}`);
      }

      return await response.json();
    };

    try {
      console.log("Fetching Course Catalog Definitions...");
      const definitionUrl = "menuEntries/166/courseCatalogDefinitions?sortBy=code,asc";
      
      // Use strict fetch matching user snippet
      const definitions = await fetchWithToken(definitionUrl, "GET");

      if (!definitions || !definitions.content) {
        throw new Error("No content in course catalog definitions");
      }

      console.log(
        `Found ${definitions.content.length} course catalogs. Fetching syllabuses for each...`
      );

      const searchUrl = "menuEntries/166/searchResult?size=100&page=1&sort=id";
      const payload = JSON.parse(JSON.stringify(SYLLABUS_PAYLOAD)); // Clone payload

      for (const element of definitions.content) {
        try {
          // Update filter ID
          if (payload.searchResultDefinition?.filtersCustom) {
            payload.searchResultDefinition.filtersCustom.id = element.id;
          }

          // Use strict fetch for search
          const response = await fetchWithToken(searchUrl, "POST", payload);
          
          const lines = response?.content?.lines || [];
          const ids = lines.map((l: any) => l[0]);
          
          if (ids.length > 0) {
            allIds.push(...ids);
          }
          console.log(`[Catalog ${element.code}] Found ${ids.length} syllabuses.`);
        } catch (e) {
             console.warn(`Failed to fetch syllabuses for catalog ${element.id}:`, e);
        }
      }

      allIds = [...new Set(allIds)];
      console.log(`Total unique syllabus IDs found: ${allIds.length}`);

    } catch (e) {
      console.error(
        "Failed to fetch syllabus IDs (skipping syllabus sync):",
        e
      );
      return [];
    }

    // 2. Fetch Details for each ID
    console.log("Fetching details for syllabuses...");
    const syllabusDetails: Syllabus[] = [];
    
    // We can't do too many parallel requests or we might get rate limited/blocked.
    // Let's do batches of 5.
    const BATCH_SIZE = 5;
    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batch = allIds.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (id: string) => {
          try {
            const endpoint = `menuEntries/166/syllabuses/${id}`;
            // Use strict fetch format for details too
            const detailRes = await fetchWithToken(endpoint, "GET");
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

      // Extract semester from code using regex (handles all formats)
      // Pattern: _SXX_ where XX is the semester number
      const semesterMatch = syllabusCode.match(/_S(\d+)_/i);
      const semester = semesterMatch ? parseInt(semesterMatch[1], 10) : 0;

      // Extract subject code (everything after _SXX_) and get UE (first part)
      const subjectCode = extractSubjectCode(syllabusCode);
      const ueCode = subjectCode.split("_")[0] || "Unknown";

      console.log(
        `[Syllabus] Code: "${syllabusCode}" -> Semester: ${semester}, UE: "${ueCode}", SubjectCode: "${subjectCode}"`
      );

      return {
        id: row.id,
        UE: ueCode,
        semester: semester,
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
