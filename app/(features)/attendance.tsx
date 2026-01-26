import { Papicons } from "@getpapillon/papicons"
import { MenuView } from "@react-native-menu/menu";
import { useTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { t } from "i18next";
import { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, View } from "react-native";

import AbsencesAPI from "@/services/absences";
import { getManager } from "@/services/shared";
import { Attendance } from "@/services/shared/attendance";
import { Period } from "@/services/shared/grade";
import AnimatedNumber from "@/ui/components/AnimatedNumber";
import { Dynamic } from "@/ui/components/Dynamic";
import Icon from "@/ui/components/Icon";
import Item, { Trailing } from "@/ui/components/Item";
import List from "@/ui/components/List";
import { NativeHeaderHighlight, NativeHeaderPressable, NativeHeaderSide, NativeHeaderTitle } from "@/ui/components/NativeHeader";
import Stack from "@/ui/components/Stack";
import Typography from "@/ui/components/Typography";
import adjust from "@/utils/adjustColor";
import i18n from "@/utils/i18n";
import { error } from "@/utils/logger/logger";
import { getPeriodName, getPeriodNumber, isPeriodWithNumber } from "@/utils/services/periods";

export default function AttendanceView() {
  const theme = useTheme()
  const { colors } = theme;

  const search = useLocalSearchParams();

  const parseSafe = <T,>(data: any, fallback: T): T => {
    try {
      return data ? JSON.parse(String(data)) : fallback;
    } catch {
      return fallback;
    }
  };

  const initialCurrentPeriod = parseSafe<Period | null>(search.currentPeriod, null);
  const initialPeriods = parseSafe<Period[]>(search.periods, []);
  const initialAttendances = parseSafe<(Attendance | null)[]>(search.attendances, [])
    .filter(a => a !== null) as Attendance[];

  const [periods, setPeriods] = useState<Period[]>(initialPeriods);
  const [attendances, setAttendances] = useState<Attendance[]>(initialAttendances);
  const [period, setPeriod] = useState<Period | null>(initialCurrentPeriod);
  const [rawData, setRawData] = useState<any[]>([]);

  useEffect(() => {
    const refreshData = async () => {
      try {
        let data: any[] = [];

        if (AbsencesAPI.isLoggedIn()) {
          try {
            data = await AbsencesAPI.sync();
          } catch (syncError) {
            console.warn("Absences sync failed, using cached data:", syncError);
            data = await AbsencesAPI.initializeFromDatabase();
          }
        } else {
          data = await AbsencesAPI.initializeFromDatabase();
        }

        setRawData(data);

        if (data && data.length > 0) {
          const mappedPeriods: Period[] = data.map((level: any) => {
            let start = new Date();
            let end = new Date(0);

            if (level.periods && level.periods.length > 0) {
              const starts = level.periods.map((p: any) => new Date(p.beginDate).getTime());
              const ends = level.periods.map((p: any) => new Date(p.endDate).getTime());
              start = new Date(Math.min(...starts));
              end = new Date(Math.max(...ends));
            }

            return {
              id: level.levelName,
              name: level.levelName,
              start,
              end,
              createdByAccount: "auriga",
            };
          });

          mappedPeriods.sort((a, b) => b.start.getTime() - a.start.getTime());

          setPeriods(mappedPeriods);
          if (mappedPeriods.length > 0) {
            setPeriod(mappedPeriods[0]);
          }
        }

      } catch (e) {
        console.error("Failed to refresh attendance data", e);
      }
    };

    refreshData();
  }, []);

  useEffect(() => {
    if (!period || !rawData.length) return;

    const levelData = rawData.find((l: any) => l.levelName === period.id);
    if (levelData && levelData.periods) {
      const allAbsences: any[] = [];

      levelData.periods.forEach((p: any) => {
        if (p.absences) {
          p.absences.forEach((abs: any) => {
            allAbsences.push(abs);
          });
        }
      });

      allAbsences.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      const mappedAbsencesRaw = allAbsences.map(abs => {
        const from = new Date(abs.startDate);
        const to = new Date(from.getTime() + 60 * 60 * 1000);

        return {
          id: String(abs.slotId) || Math.random().toString(),
          createdByAccount: "auriga",
          from: from,
          to: to,
          timeMissed: 60,
          justified: !!abs.justificatory,
          reason: abs.justificatory || abs.subjectName,
          subjectName: abs.subjectName,
          original: abs
        }
      });

      const consolidated: any[] = [];
      if (mappedAbsencesRaw.length > 0) {
        let current = mappedAbsencesRaw[0];
        for (let i = 1; i < mappedAbsencesRaw.length; i++) {
          const next = mappedAbsencesRaw[i];

          const isSameSubject = current.subjectName === next.subjectName;
          const isSameJustification = current.justified === next.justified;
          const isSameDay = current.from.toDateString() === next.from.toDateString();

          if (isSameSubject && isSameJustification && isSameDay) {
            // Merge: keep earliest start time, default end time extends
            // Sum durations: 1h + 1h = 2h (120 min)
            current.to = new Date(Math.max(current.to.getTime(), next.to.getTime()));
            current.timeMissed += next.timeMissed;
          } else {
            consolidated.push(current);
            current = next;
          }
        }
        consolidated.push(current);
      }

      consolidated.sort((a, b) => b.from.getTime() - a.from.getTime());

      const mappedAttendance: Attendance = {
        id: String(levelData.semesterId),
        kidId: "me",
        createdByAccount: "auriga",
        absences: consolidated,
        delays: [],
        punishments: [],
        observations: []
      };

      setAttendances([mappedAttendance]);
    } else {
      setAttendances([]);
    }
  }, [period, rawData]);

  const { missedTime, missedTimeUnjustified, unjustifiedAbsenceCount, unjustifiedDelayCount, absenceCount, delayCount } = useMemo(() => {
    let missed = 0;
    let unjustified = 0;
    let unjustifiedAbs = 0;
    let unjustifiedDelays = 0;
    let Abs = 0
    let Delays = 0
    for (const attendance of attendances) {
      for (const absence of attendance.absences) {
        Abs += 1;
        missed += absence.timeMissed;
        if (!absence.justified) {
          unjustified += absence.timeMissed;
          unjustifiedAbs += 1;
        }
      }
      for (const delay of attendance.delays) {
        Delays += 1;
        if (!delay.justified) {
          unjustifiedDelays += 1;
          unjustified += delay.duration
        }
        missed += delay.duration
      }
    }

    return { missedTime: missed, missedTimeUnjustified: unjustified, unjustifiedAbsenceCount: unjustifiedAbs, unjustifiedDelayCount: unjustifiedDelays, absenceCount: Abs, delayCount: Delays };
  }, [period, attendances]);

  const dangerColor = useMemo(() => adjust("#C50000", -0.15), []);
  const dangerBg = "#C5000030";
  const dangerBorder = "#0000000D";

  return (
    <>
      {period && (
        <>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
          >
            <View
              style={{
                flex: 1,
                gap: 23.5,
                paddingHorizontal: 20
              }}
            >
              <Stack
                card
                direction="horizontal"
                width={"100%"}
                style={{ marginTop: 20 }}
              >
                <Stack
                  vAlign="center"
                  hAlign="center"
                  padding={12}
                  style={{ width: '50%' }}
                >
                  <Icon papicon opacity={0.5}>
                    <Papicons name={"Ghost"} />
                  </Icon>
                  <Typography color="secondary">
                    {t("Attendance_Hours_Missed")}
                  </Typography>
                  <Stack direction="horizontal" gap={0}>
                    <AnimatedNumber variant="h5">
                      {String(Math.floor((missedTime % 3600) / 60)).padStart(2, '0')}
                    </AnimatedNumber>
                    <Typography variant="h5">
                      h
                    </Typography>
                    <AnimatedNumber variant="h5">
                      {String(missedTime % 60).padStart(2, '0')}
                    </AnimatedNumber>
                  </Stack>
                </Stack>
                <Stack
                  vAlign="center"
                  hAlign="center"
                  padding={12}
                  style={{ flex: 1, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderLeftWidth: 1, borderLeftColor: colors.border }}
                  backgroundColor={adjust("#C50000", theme.dark ? -0.8 : 0.8)}
                >
                  <Icon papicon fill={adjust("#C50000", -0.15)}>
                    <Papicons name={"Minus"} />
                  </Icon>
                  <Typography style={{ color: adjust("#C50000", -0.15) }}>
                    {t("Attendance_Hours_Unjustified")}
                  </Typography>
                  <Stack direction="horizontal" gap={0}>
                    <AnimatedNumber variant="h5" color={adjust("#C50000", -0.15)}>
                      {String(Math.floor((missedTimeUnjustified % 3600) / 60)).padStart(2, '0')}
                    </AnimatedNumber>
                    <Typography variant="h5" color={adjust("#C50000", -0.15)}>
                      h
                    </Typography>
                    <AnimatedNumber variant="h5" color={adjust("#C50000", -0.15)}>
                      {String(missedTimeUnjustified % 60).padStart(2, '0')}
                    </AnimatedNumber>
                  </Stack>
                </Stack>
              </Stack>

              {attendances.some(attendance => attendance.absences.length == 0) && attendances.some(attendance => attendance.delays.length == 0) && (
                <Stack vAlign="center" hAlign="center" margin={16}>
                  <Icon papicon size={32}>
                    <Papicons name={"Ghost"} />
                  </Icon>
                  <Typography variant="h4" color="text" align="center">
                    {t("Attendance_NoEvent_Title")}
                  </Typography>
                  <Typography variant="body1" align="center" color="secondary">
                    {t("Attendance_NoEvent_Description")}
                  </Typography>
                </Stack>
              )}

              {attendances.some(attendance => attendance.absences.length > 0) && (
                <>
                  <Stack
                    direction="horizontal"
                    hAlign="center"
                    style={{
                      justifyContent: "space-between"
                    }}
                  >
                    <Stack direction="horizontal" hAlign="center">
                      <Icon papicon opacity={0.5}>
                        <Papicons name={"Ghost"} />
                      </Icon>
                      <Typography variant="h5" style={{ opacity: 0.5 }}>{t("Attendance_Missing")}</Typography>
                    </Stack>
                    <Typography variant="h5" style={{ opacity: 0.5 }}>x{absenceCount}</Typography>
                  </Stack>
                  <View style={{ flex: 1 }}>
                    <List>
                      {attendances.map((attendance, index) =>
                        attendance.absences.map((absence, absenceIndex) => {
                          const fromDate = new Date(absence.from);
                          const day = fromDate.getDate().toString().padStart(2, '0');
                          const month = (fromDate.getMonth() + 1).toString().padStart(2, '0');
                          return (
                            <Item key={`${index}-${absenceIndex}`}>
                              <Trailing>
                                <Stack direction="horizontal" hAlign="center">
                                  {!absence.justified && (
                                    <Icon papicon fill={dangerColor}>
                                      <Papicons name={"Minus"} />
                                    </Icon>
                                  )}
                                  <View style={{ padding: 6, paddingHorizontal: 12, backgroundColor: absence.justified ? "transparent" : dangerBg, borderRadius: 25, borderWidth: 2, borderColor: dangerBorder }}>
                                    <Typography variant="title" color={absence.justified ? colors.text : dangerColor}>{String(Math.floor(absence.timeMissed / 60)).padStart(2, '0')}h{String(absence.timeMissed % 60).padStart(2, '0')}</Typography>
                                  </View>
                                </Stack>
                              </Trailing>
                              <Typography style={{ fontWeight: "600" }}>
                                {absence.subjectName}
                              </Typography>
                              <Typography>
                                {absence.reason || t("Attendance_NoReason")}
                              </Typography>
                              <Typography color="#7F7F7F">
                                {day}/{month}
                              </Typography>
                            </Item>
                          );
                        })
                      )}
                    </List>
                  </View>
                </>
              )}

              {attendances.some(attendance => attendance.delays.length > 0) && (
                <>
                  <Stack
                    direction="horizontal"
                    hAlign="center"
                    style={{
                      justifyContent: "space-between"
                    }}
                  >
                    <Stack direction="horizontal" hAlign="center">
                      <Icon papicon opacity={0.5}>
                        <Papicons name={"Clock"} />
                      </Icon>
                      <Typography variant="h5" style={{ opacity: 0.5 }}>{t("Attendance_Delays")}</Typography>
                    </Stack>
                    <Typography variant="h5" style={{ opacity: 0.5 }}>x{delayCount}</Typography>
                  </Stack>
                  <View style={{ flex: 1 }}>
                    <List>
                      {attendances.map((attendance, index) =>
                        attendance.delays.map((delay, absenceIndex) => {
                          const fromDate = new Date(delay.givenAt);
                          const day = fromDate.getDate().toString().padStart(2, '0');
                          const month = (fromDate.getMonth() + 1).toString().padStart(2, '0');
                          return (
                            <Item key={`${index}-${absenceIndex}`}>
                              <Trailing>
                                <Stack direction="horizontal" hAlign="center">
                                  {!delay.justified && (
                                    <Icon papicon fill={dangerColor}>
                                      <Papicons name={"Minus"} />
                                    </Icon>
                                  )}
                                  <View style={{ padding: 6, paddingHorizontal: 12, backgroundColor: delay.justified ? "transparent" : dangerBg, borderRadius: 25, borderWidth: 2, borderColor: dangerBorder }}>
                                    <Typography variant="title" color={delay.justified ? colors.text : dangerColor}>{delay.duration}m</Typography>
                                  </View>
                                </Stack>
                              </Trailing>
                              <Typography>
                                {delay.reason || t("Attendance_NoReason")}
                              </Typography>
                              <Typography color="#7F7F7F">
                                {day}/{month}
                              </Typography>
                            </Item>
                          );
                        })
                      )}
                    </List>
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          <NativeHeaderSide side="Left" style={{ paddingTop: Platform.OS === "android" ? 10 : 0 }}>
            <NativeHeaderPressable onPress={() => { router.back() }}>
              <Icon papicon opacity={0.5}>
                <Papicons name={"Cross"} />
              </Icon>
            </NativeHeaderPressable>
          </NativeHeaderSide>

          <NativeHeaderSide side="Right" style={{ paddingTop: Platform.OS === "android" ? 10 : 0 }}>
            <NativeHeaderPressable onPress={() => {
              AbsencesAPI.setToken("")
              router.back();
            }}>
              <Icon papicon opacity={0.5}>
                <Papicons name={"Logout"} />
              </Icon>
            </NativeHeaderPressable>
          </NativeHeaderSide>

          <NativeHeaderTitle style={{ paddingTop: Platform.OS === "android" ? 10 : 0 }} key={"att:" + period?.name}>
            <MenuView
              key={String(period?.id ?? "")}
              onPressAction={async ({ nativeEvent }) => {
                const actionId = nativeEvent.event;

                if (actionId.startsWith("period:")) {
                  const selectedPeriodId = actionId.replace("period:", "");
                  const selectedPeriod: Period | undefined = periods.find(item => item.id === selectedPeriodId)

                  if (!selectedPeriod) {
                    error("Invalid Period")
                  }

                  if (selectedPeriod) {
                    const manager = getManager()
                    const attendancesFetched = await manager.getAttendanceForPeriod(selectedPeriod.name)

                    setAttendances(attendancesFetched)
                    setPeriod(selectedPeriod)
                  }
                }
              }}
              actions={
                periods.map((item) => ({
                  id: "period:" + item.id,
                  title: (getPeriodName(item.name || "") + " " + (isPeriodWithNumber(item.name || "") ? getPeriodNumber(item.name || "0") : "")).trim(),
                  subtitle: `${new Date(item.start).toLocaleDateString(i18n.language, {
                    month: "short",
                    year: "numeric",
                  })} - ${new Date(item.end).toLocaleDateString(i18n.language, {
                    month: "short",
                    year: "numeric",
                  })}`,
                  state: String(period?.id ?? "") === String(item.id ?? "") ? "on" : "off",
                  image: Platform.select({
                    ios: (getPeriodNumber(item.name || "0")) + ".calendar"
                  }),
                  imageColor: colors.text,
                }))}>
              <Dynamic
                animated={true}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  width: 200,
                  height: 60,
                }}
              >
                <Dynamic animated>
                  <Typography inline variant="navigation">{getPeriodName(period?.name ?? "")}</Typography>
                </Dynamic>
                <Dynamic animated>
                  <NativeHeaderHighlight>{getPeriodNumber(period?.name ?? "")}</NativeHeaderHighlight>
                </Dynamic>
                <Dynamic animated>
                  <Papicons name={"ChevronDown"} strokeWidth={2.5} color={colors.text} opacity={0.6} />
                </Dynamic>
              </Dynamic>
            </MenuView>
          </NativeHeaderTitle>
        </>
      )}
    </>
  );
}