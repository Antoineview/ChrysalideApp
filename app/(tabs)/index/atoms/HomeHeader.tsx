import { LiquidGlassContainer } from '@sbaiahmed1/react-native-blur';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AbsencesAPI from "@/services/absences";
import Stack from '@/ui/components/Stack';
import { getCurrentPeriod } from '@/utils/grades/helper/period';

import HomeHeaderButton, { HomeHeaderButtonItem } from '../components/HomeHeaderButton';
import { useHomeHeaderData } from '../hooks/useHomeHeaderData';

const HomeHeader = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { attendancesPeriods, attendances, absencesCount } = useHomeHeaderData();

  const HomeHeaderButtons: HomeHeaderButtonItem[] = useMemo(() => [
    {
      title: t("Home_Attendance_Title"),
      icon: "chair",
      color: "#D62B94",
      description: absencesCount > 0 ?
        (absencesCount > 1 ? t("Home_Attendance_Button_Description_Number", { number: absencesCount }) : t("Home_Attendance_Button_Description_Singular"))
        : t("Home_Attendance_Button_Description_None"),
      onPress: () => {
        if (!AbsencesAPI.isLoggedIn()) {
          router.push("/(modals)/login-attendance");
          return;
        }

        router.push({
          pathname: "/(features)/attendance",
          params: {
            periods: JSON.stringify(attendancesPeriods),
            currentPeriod: JSON.stringify(getCurrentPeriod(attendancesPeriods)),
            attendances: JSON.stringify(attendances),
          },
        });
      }
    }
  ], [absencesCount, attendancesPeriods, attendances, t]);

  return (
    <View style={{ paddingHorizontal: 0, paddingVertical: 12, width: "100%", flex: 1 }}>
      <View style={{ height: insets.top + 56 }} />
      <LiquidGlassContainer>
        <Stack inline flex width={"100%"}>
          <View style={{ width: '100%', gap: 6 }}>
            {Array.from({ length: Math.ceil(HomeHeaderButtons.length / 2) }).map((_, i) => (

              <View key={i} style={{ flexDirection: 'row', gap: 6, width: '100%' }}>
                {HomeHeaderButtons.slice(i * 2, i * 2 + 2).map((item) => (
                  <HomeHeaderButton key={item.title} item={item} />
                ))}
              </View>
            ))}
          </View>
        </Stack>
      </LiquidGlassContainer>

    </View>
  );
};

export default HomeHeader;