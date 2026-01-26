import { useEffect, useMemo, useRef, useState } from "react";

import { getChatsFromCache } from "@/database/useChat";
import {
  AccountManager,
  getManager,
  subscribeManagerUpdate,
} from "@/services/shared";
import { Attendance } from "@/services/shared/attendance";
import { Chat } from "@/services/shared/chat";
import { Period } from "@/services/shared/grade";
import { useAccountStore } from "@/stores/account";
import { Services } from "@/stores/account/types";
import { getCurrentPeriod } from "@/utils/grades/helper/period";

export const useHomeHeaderData = () => {
  const accounts = useAccountStore(state => state.accounts);
  const lastUsedAccount = useAccountStore(state => state.lastUsedAccount);
  const account = accounts.find(a => a.id === lastUsedAccount);

  const availableCanteenCards = useMemo(
    () =>
      account?.services.filter(service =>
        [
          Services.TURBOSELF,
          Services.ARD,
          Services.ECOLEDIRECTE,
          Services.IZLY,
        ].includes(service.serviceId)
      ) ?? [],
    [account]
  );

  const attendancesPeriodsRef = useRef<Period[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [lastAbsence, setLastAbsence] = useState<any>(null);

  const absencesCount = useMemo(() => {
    if (!attendances) {
      return 0;
    }
    let count = 0;
    attendances.forEach(att => {
      if (att && "absences" in att) {
        if (att.absences) {
          count += att.absences.length;
        }
      }
    });
    return count;
  }, [attendances]);

  useEffect(() => {
    const init = async () => {
      const cachedChats = await getChatsFromCache();
      setChats(cachedChats);
    };

    init();

    const updateAttendance = async (manager: AccountManager) => {
      const periods = await manager.getAttendancePeriods();
      const currentPeriod = getCurrentPeriod(periods);

      attendancesPeriodsRef.current = periods;

      if (currentPeriod) {
        const fetchedAttendances = await manager.getAttendanceForPeriod(
          currentPeriod.name
        );
        setAttendances(fetchedAttendances);
      } else {
        setAttendances([]);
      }

      // Fetch all absences for all periods to find the last one
      const allPromises = periods.map(p => manager.getAttendanceForPeriod(p.name));
      const allResults = await Promise.all(allPromises);

      const allAbsences: any[] = [];
      allResults.flat().forEach(att => {
        if (att.absences) {
          att.absences.forEach((abs: any) => {
            // Ensure we have date objects or timestamps
            if (!abs.from) abs.from = abs.date || abs.startDate; // Fallback properties if needed, usually 'from' is correct in mapped
            allAbsences.push(abs);
          });
        }
      });

      // Sort by date descending
      allAbsences.sort((a, b) => new Date(b.from).getTime() - new Date(a.from).getTime());

      if (allAbsences.length > 0) {
        setLastAbsence(allAbsences[0]);
      } else {
        setLastAbsence(null);
      }
    };

    const updateDiscussions = async (manager: AccountManager) => {
      const fetchedChats = await manager.getChats();
      setChats(fetchedChats);
    };

    const unsubscribe = subscribeManagerUpdate(_ => {
      const manager = getManager();
      updateAttendance(manager);
      updateDiscussions(manager);
    });

    const manager = getManager();
    updateAttendance(manager);
    updateDiscussions(manager);

    return () => unsubscribe();
  }, []);

  return {
    availableCanteenCards,
    attendancesPeriods: attendancesPeriodsRef.current,
    attendances,
    absencesCount,
    lastAbsence,
    chats,
  };
};
