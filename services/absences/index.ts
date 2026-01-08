import { MMKV } from "react-native-mmkv";

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
    this.token = token;
    storage.set("absences_token", token);
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
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Dest": "empty",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch grades: ${response.status}`);
      }

      const data = await response.json();

      console.log(`Fetched ${data.length} levels from Absences API`);
      
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
}

export default new AbsencesAPI();