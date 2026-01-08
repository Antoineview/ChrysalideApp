import { MMKV } from "react-native-mmkv";

<<<<<<< Updated upstream
import { addAttendanceToDatabase } from "@/database/useAttendance";
import { addPeriodsToDatabase } from "@/database/useGrades";
import { Attendance, Absence } from "@/services/shared/attendance";
import { Period } from "@/services/shared/grade";
import { AbsencesAPIResponse, AbsenceItem } from "./types";

=======
>>>>>>> Stashed changes
// Initialize MMKV storage
export const storage = new MMKV({
  id: "absences-storage",
});

const BASE_URL = "https://absences.epita.net/api/Users/student/grades";

class AbsencesAPI {
  private token: string | null = null;

  constructor() {
    const savedToken = storage.getString("absences_token");
    if (savedToken) {
      this.token = savedToken;
    }
  }

  setToken(token: string) {
    const cleanToken = token.replace('Bearer ', '').trim();
    this.token = cleanToken;
    storage.set("absences_token", cleanToken);
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  async sync(token?: string) {
    if (token) {
      this.setToken(token);
    }

    if (!this.token) {
      console.error("No token provided for Absences sync");
      return;
    }

    try {
      const response = await fetch(BASE_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
          Referer: "https://absences.epita.net/parent/home",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch grades: ${response.status}`);
      }

      const data = await response.json();

<<<<<<< Updated upstream
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
=======
      console.log(`Fetched ${data.length} levels from Absences API`);
>>>>>>> Stashed changes
      
      storage.set("absences_grades", JSON.stringify(data));
      
      return data;
    } catch (error) {
      console.error("Error fetching absences:", error);
      throw error;
    }
  }

  async initializeFromDatabase() {
      const cached = storage.getString("absences_grades");
      if (cached) {
        return JSON.parse(cached);
      }
      return [];
    }
<<<<<<< Updated upstream

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
=======
>>>>>>> Stashed changes
}

export default new AbsencesAPI();