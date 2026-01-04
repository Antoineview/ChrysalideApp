import { MMKV } from "react-native-mmkv";

import { SYLLABUS_PAYLOAD, SYLLABUS2_PAYLOAD } from "./payloads";
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
   * Syncs all data from Auriga (Grades, Syllabus) and stores it in local storage.
   */
  async sync() {
    console.log("Starting Auriga Sync...");

    // 1. Fetch Grades
    console.log("Fetching Grades...");
    try {
      const grades = await this.fetchAllGrades();
      storage.set("auriga_grades", JSON.stringify(grades));
      console.log(`Fetched ${grades.length} grades.`);
    } catch (e) {
      console.error("Failed to fetch grades:", e);
    }

    // 2. Fetch Syllabus
    console.log("Fetching Syllabus...");
    try {
      const syllabus = await this.fetchAllSyllabus();
      storage.set("auriga_syllabus", JSON.stringify(syllabus));
      console.log(`Fetched ${syllabus.length} syllabus items.`);
    } catch (e) {
      console.error("Failed to fetch syllabus:", e);
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
    // Correct endpoint: menuEntries/1036/query/945 (GET request)
    // Note: This menu ID (1036) and query ID (945) might be user-specific. If it fails, we return empty.
    try {
      const response = await this.getDataFromAuriga(
        "menuEntries/1036/query/945"
      );

      // User's response structure: data.content.lines.map(...)
      // My previous assumption was response.rows.
      // Adapting to User's structure:

      // Check if response has 'content' and 'lines' (User's structure)
      // Or 'rows' (My old structure - maybe from syllabus?)
      // User code: grades.content.lines.map(element => ...)

      const lines = response?.content?.lines || response?.rows || [];

      const grades: Grade[] = lines
        .map((row: any) => {
          // User map:
          // code: element[0]
          // type: element[4]
          // name: element[2]
          // semester: ... element[2].split ...
          // grade: element[1]

          // Wait, lines might be Arrays if it's 'content.lines'
          // In my previous 'rows' structure, row.data[Index] was used.
          // User's code implies 'element' IS the array.

          // Let's assume 'row' is the array [code, grade, name, ...] or similar.
          // Or row is { data: [...] } ?

          // If we trust the User's code: element is an array.
          // element[0] = code
          // element[1] = grade
          // element[2] = name
          // element[4] = type

          // My previous code:
          // row.data[8] = code
          // row.data[6] = grade

          // The indices are VERY different.
          // I will trust the USER's code indices for THIS endpoint.

          const isArray = Array.isArray(row);
          const data = isArray ? row : row.data; // Handle both potential formats

          if (!data) {
            return null;
          }

          // User indices:
          const code = data[0];
          const gradeValue = data[1];
          const name = data[2];
          const type = data[4];

          // Semester parsing from Name: "UE_..._S3_..."
          // User code: parseInt(String(element[2]).split("_")[4].split("S")[1])
          let semester = 0;
          try {
            if (typeof name === "string" && name.includes("_S")) {
              const parts = name.split("_");
              const semPart = parts.find(
                p => p.startsWith("S") && p.length <= 3
              ); // Find "S3", "S4"
              if (semPart) {
                semester = parseInt(semPart.replace("S", ""));
              }
            }
          } catch (e) {}

          if (gradeValue === null || gradeValue === undefined) {
            return null;
          }

          return {
            code: String(code),
            type: String(type),
            name: String(name),
            semester: semester,
            grade: gradeValue,
          };
        })
        .filter((g: any) => g !== null);

      return grades;
    } catch (e) {
      console.warn("Grades fetch failed (endpoint may be user-specific):", e);
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
    const ids1 = await this.postDataToAuriga(entryUrl, SYLLABUS_PAYLOAD);
    const ids2 = await this.postDataToAuriga(entryUrl, SYLLABUS2_PAYLOAD);

    // ids.content.lines contains the IDs?
    // User code: sylabuses.push(...data.content.lines.map(line => line[0]));

    const extractIds = (res: any) =>
      res?.content?.lines?.map((l: any) => l[0]) || [];

    const allIds = [...new Set([...extractIds(ids1), ...extractIds(ids2)])];
    console.log(`Found ${allIds.length} syllabus IDs. Fetching details...`);

    // 2. Fetch Details for each ID (Limit to 10 for speed during testing?)
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

      return {
        id: row.id,
        UE: fileName.split("_")[5] || "Unknown",
        semester: fileName.split("_")[4]?.replace("S", "")
          ? parseInt(fileName.split("_")[4].replace("S", ""))
          : 0,
        name: fileName,
        code: row.field?.code,
        minScore: row.customAttributes?.miniScore,
        duration: row.duration,
        period: {
          startDate: row.period?.startDate,
          endDate: row.period?.endDate,
        },
        exams:
          row.syllabusAssessmentComponents?.map((e: any) => ({
            id: e.id,
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
