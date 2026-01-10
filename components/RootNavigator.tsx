import { useTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { t } from 'i18next';
import React, { useMemo } from 'react';
import { Platform } from 'react-native';

import {
  ALERT_SCREEN_OPTIONS,
  CHANGELOG_SCREEN_OPTIONS,
  CONSENT_SCREEN_OPTIONS,
  DEMO_SCREEN_OPTIONS,
  DEVMODE_SCREEN_OPTIONS,
  STACK_SCREEN_OPTIONS
} from '@/constants/LayoutScreenOptions';
import { runsIOS26 } from '@/ui/utils/IsLiquidGlass';
import { screenOptions } from '@/utils/theme/ScreenOptions';

export function RootNavigator() {
  const theme = useTheme();

  // Memoize combined screen options to prevent object recreation
  const stackScreenOptions = useMemo(() => ({
    ...screenOptions,
    ...STACK_SCREEN_OPTIONS,
    contentStyle: {
      backgroundColor: theme.colors.background
    }
  }), [theme]);

  return (
    <Stack initialRouteName='(tabs)' screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="(new)" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="(settings)" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="demo" options={DEMO_SCREEN_OPTIONS} />
      <Stack.Screen name="consent" options={CONSENT_SCREEN_OPTIONS} />
      <Stack.Screen name="changelog" options={CHANGELOG_SCREEN_OPTIONS} />
      <Stack.Screen name="devmode" options={DEVMODE_SCREEN_OPTIONS} />
      <Stack.Screen name="alert" options={ALERT_SCREEN_OPTIONS} />

      <Stack.Screen
        name="(modals)/syllabus"
        options={{
          headerShown: false,
          headerTitle: "",
          presentation: "modal",
          sheetAllowedDetents: undefined,
          sheetGrabberVisible: true,
          sheetCornerRadius: 20,
        }}
      />
      <Stack.Screen
        name="(modals)/wallpaper"
        options={{
          presentation: "modal",
          headerLargeTitle: false,
          headerTitle: t("Modal_Wallpaper_Title"),
          contentStyle: {
            backgroundColor: theme.colors.card
          }
        }}
      />

      <Stack.Screen
        name="(modals)/profile"
        options={{
          presentation: "modal",
          headerLargeTitle: false,
          headerTitle: t("Modal_Profile_Title")
        }}
      />
      <Stack.Screen
        name="(modals)/task"
        options={{
          headerShown: Platform.OS !== 'ios',
          headerTitle: t("Modal_Task_Title"),
          headerLargeTitle: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="(modals)/grade"
        options={{
          headerShown: false,
          headerTitle: t("Modal_Grades_Title"),
          headerLargeTitle: false,
          presentation: "formSheet",
          sheetAllowedDetents: [0.45, 0.65],
          sheetGrabberVisible: true,
          contentStyle: {
            width: '98%',
            alignSelf: 'center',
            backgroundColor: 'transparent',
            borderRadius: 50,
            overflow: 'hidden',
          }
        }}
      />
      <Stack.Screen
        name="(modals)/login-attendance"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="(modals)/news"
        options={{
          headerShown: true,
          headerTitle: "",
          headerLargeTitle: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="(modals)/course"
        options={{
          headerShown: Platform.OS !== 'ios',
          headerTitle: t("Modal_Course_Title"),
          headerLargeTitle: false,
          headerTransparent: Platform.OS === 'ios' ? runsIOS26 : false,
          presentation: "modal",
          contentStyle: {
            borderRadius: Platform.OS === 'ios' ? 30 : 0,
            overflow: Platform.OS === 'ios' ? "hidden" : "visible",
          }
        }}
      />
      <Stack.Screen
        name="(modals)/notifications"
        options={{
          headerShown: false,
          headerTitle: "Notifications",
          headerTransparent: runsIOS26,
          headerLargeTitle: false,
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.5, 0.75, 1],
          sheetCornerRadius: runsIOS26 ? undefined : 30,
          contentStyle: {
            backgroundColor: runsIOS26 ? 'transparent' : undefined
          }
        }}
      />



      <Stack.Screen
        name="(features)/(news)/specific"
        options={{
          headerShown: true,
          headerTitle: t("Tab_News"),
          headerTransparent: runsIOS26,
          headerLargeTitle: false,
        }}
      />

      <Stack.Screen
        name="(features)/soon"
        options={{
          headerShown: false,
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: "fitToContents"
        }}
      />



      <Stack.Screen
        name="(features)/attendance"
        options={{
          headerShown: true,
          headerTitle: t("Tab_Attendance"),
          headerTransparent: runsIOS26,
          headerLargeTitle: true,
          presentation: "modal"
        }}
      />
      <Stack.Screen
        name="(modals)/subject-info"
        options={{
          headerShown: false,
          presentation: "formSheet",
          sheetAllowedDetents: [0.38],
          sheetGrabberVisible: true,
          sheetCornerRadius: 50,
        }}
      />
    </Stack>
  );
}
