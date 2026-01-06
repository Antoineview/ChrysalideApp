import { MMKV } from "react-native-mmkv";

import { addAttendanceToDatabase } from "@/database/useAttendance";
import { addPeriodsToDatabase } from "@/database/useGrades";
import { Attendance, Absence } from "@/services/shared/attendance";
import { Period } from "@/services/shared/grade";
import { AbsencesAPIResponse, AbsenceItem } from "./types";

// Initialize MMKV storage
export const storage = new MMKV({
  id: "absences-storage",
});

const BASE_URL = "https://absences.epita.net/api";

class AbsencesAPI {
  private token: string | null = null;
  private cookies: string | null = null;

  constructor(token?: string) {
    const savedToken = storage.getString("absences_token");
    const savedCookies = storage.getString("absences_cookies");
    if (token) {
      this.token = token;
      this.saveToken(token);
    } else if (savedToken) {
      this.token = savedToken;
    }
    
    if (savedCookies) {
        this.cookies = savedCookies;
    }
  }

  setToken(token: string) {
    this.token = token;
    this.saveToken(token);
  }
  
  setCookies(cookies: string) {
      this.cookies = cookies;
      storage.set("absences_cookies", cookies);
  }

  private saveToken(token: string) {
    storage.set("absences_token", token);
  }

  getToken() {
    return this.token;
  }

  isLoggedIn() {
    return !!this.token || !!this.cookies;
  }

  /**
   * Syncs all data from Absences API and stores it in database.
   */
  async sync(preFetchedData?: AbsencesAPIResponse[]) {
    console.log("Starting Absences Sync...");

    try {
      let responses = preFetchedData || await this.fetchGrades();
      
      // Filter to keep only the last semester from the JSON
      if (responses.length > 0) {
          // Sort by levelName logic (S1, S2, S3...) to ensure we get the latest
          responses.sort((a, b) => {
              const nameA = a.levelName || "";
              const nameB = b.levelName || "";
              return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
          });

          const selectedSemester = responses[responses.length - 1];
          responses = [selectedSemester];
          console.log(`Selected latest semester: ${selectedSemester.levelName} from available: ${responses.map(r => r.levelName).join(", ")}`);
      }

      storage.set("absences_data", JSON.stringify(responses));
      console.log(`Fetched ${responses.length} semesters (filtered to last).`);

      const periodsToSave: Period[] = [];

      for (const semester of responses) {
        let periodName = semester.levelName; // e.g. "S1"
        // Normalize "S1" to "Semestre 1" to match likely UI expectations
        if (periodName.match(/^S\d+$/)) {
          periodName = periodName.replace("S", "Semestre ");
        }

        // Calculate period start and end from sub-periods
        let start = new Date(8640000000000000);
        let end = new Date(-8640000000000000);
        
        if (semester.periods && semester.periods.length > 0) {
            semester.periods.forEach(p => {
                const pStart = new Date(p.beginDate);
                const pEnd = new Date(p.endDate);
                if (pStart < start) start = pStart;
                if (pEnd > end) end = pEnd;
            });
        } else {
            start = new Date();
            end = new Date();
        }

        periodsToSave.push({
            id: periodName,
            name: periodName,
            start: start,
            end: end,
            createdByAccount: "absences"
        });

        // Aggregate all absences from all periods in this semester
        const allAbsences: Absence[] = [];
        
        for (const period of semester.periods) {
          for (const abs of period.absences) {
            allAbsences.push({
              id: String(abs.slotId),
              from: new Date(abs.startDate),
              to: new Date(new Date(abs.startDate).getTime() + (1.5 * 60 * 60 * 1000)), // Assuming 1h30 classes if end not provided, or simply use startDate
              // Note: The API doesn't provide end date for the slot, assuming standard duration or just start
              reason: abs.justificatory,
              timeMissed: 0, // Not provided
              justified: !!abs.justificatory,
              createdByAccount: "absences",
              // Custom fields added in database model
              // @ts-ignore
              slotId: String(abs.slotId),
              subjectName: abs.subjectName,
              mandatory: abs.mandatory,
            });
          }
        }

        const attendance: Attendance = {
          createdByAccount: "absences", // or auriga? or multiple?
          delays: [],
          absences: allAbsences,
          punishments: [],
          observations: [],
        };

        await addAttendanceToDatabase([attendance], periodName);
        console.log(`Saved ${allAbsences.length} absences for ${periodName} to database.`);
      }

      await addPeriodsToDatabase(periodsToSave);
      console.log(`Saved ${periodsToSave.length} periods to database.`);
      
    } catch (e) {
      console.error("Failed to sync absences:", e);
      throw e;
    }
  }

  async fetchGrades(): Promise<AbsencesAPIResponse[]> {
    if (!this.token && !this.cookies) {
      throw new Error("No token or cookies provided for Absences API");
    }

    const headers: any = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    
    if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
    }
    
    if (this.cookies) {
        headers["Cookie"] = this.cookies;
    }
    
    // Add User-Agent if captured (or use a default one)
    // headers["User-Agent"] = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
    
    console.log("Fetching grades with headers (keys):", Object.keys(headers));
    if (this.token) console.log("Token prefix:", this.token.substring(0, 10) + "...");

    const response = await fetch(`${BASE_URL}/Users/student/grades`, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Absences API Error (${response.status}):`, text);
      throw new Error(`Absences API Error (${response.status}) - ${text.substring(0, 100)}`);
    }

    return await response.json();
  }
}

export default new AbsencesAPI();