import {
  createNativeBottomTabNavigator,
  NativeBottomTabNavigationEventMap,
  NativeBottomTabNavigationOptions,
} from "@bottom-tabs/react-navigation";
import { ParamListBase, TabNavigationState, useTheme } from "@react-navigation/native";
import { withLayoutContext } from "expo-router";
import React, { useMemo } from 'react';
import { useTranslation } from "react-i18next";
import { Platform } from 'react-native';

import { runsIOS26 } from "@/ui/utils/IsLiquidGlass";

const BottomTabNavigator = createNativeBottomTabNavigator().Navigator;

const Tabs = withLayoutContext<
  NativeBottomTabNavigationOptions,
  typeof BottomTabNavigator,
  TabNavigationState<ParamListBase>,
  NativeBottomTabNavigationEventMap
>(BottomTabNavigator);

// Static platform detection - computed once at module load
const IS_IOS_WITH_PADDING = runsIOS26;

// Pre-load all icons to avoid runtime require() calls
const ICONS = {
  home: IS_IOS_WITH_PADDING ?
    require('@/assets/icons/home_padding.svg')
    : require('@/assets/icons/home.svg'),
  calendar: IS_IOS_WITH_PADDING ? require('@/assets/icons/calendar_padding.svg') : require('@/assets/icons/calendar.svg'),
  grades: IS_IOS_WITH_PADDING ? require('@/assets/icons/results_padding.svg') : require('@/assets/icons/results.svg'),
  syllabus: IS_IOS_WITH_PADDING ? require('@/assets/icons/syllabus_padding.svg') : require('@/assets/icons/syllabus.svg'),
  news: IS_IOS_WITH_PADDING ? require('@/assets/icons/news_padding.svg') : require('@/assets/icons/news.svg'),
} as const;

// Static style object to prevent recreation on every render
const TAB_LABEL_STYLE = {
  fontFamily: 'medium',
  fontSize: Platform.OS === 'ios' ? 13 : 13,
} as const;

// Static icon functions to prevent recreation
const getHomeIcon = () => ICONS.home;
const getCalendarIcon = () => ICONS.calendar;
const getGradesIcon = () => ICONS.grades;
const getSyllabusIcon = () => ICONS.syllabus;
const getNewsIcon = () => ICONS.news;

// Custom hook for optimized tab translations
const useTabTranslations = () => {
  const { t } = useTranslation();

  return useMemo(() => ({
    home: t("Tab_Home"),
    calendar: t("Tab_Calendar"),
    grades: t("Tab_Grades"),
    syllabus: t("Tab_Syllabus"),
    news: t("Tab_News"),
  }), [t]);
};

export default function TabLayout() {
  // Use optimized translation hook
  const translations = useTabTranslations();
  const { colors } = useTheme();

  // Memoize screen options to prevent object recreation
  const screenOptions = useMemo(() => ({
    index: {
      title: translations.home,
      tabBarIcon: getHomeIcon,
    },
    calendar: {
      title: translations.calendar,
      tabBarIcon: getCalendarIcon,
    },
    grades: {
      title: translations.grades,
      tabBarIcon: getGradesIcon,
    },
    syllabus: {
      title: translations.syllabus,
      tabBarIcon: getSyllabusIcon,
    },
    news: {
      title: translations.news,
      tabBarIcon: getNewsIcon,
    },
  }), [translations]);

  return (
    <Tabs
      sidebarAdaptable
      hapticFeedbackEnabled
      labeled={true}
      tabLabelStyle={TAB_LABEL_STYLE}
      tabBarStyle={{
        backgroundColor: colors.card,
      }}
      rippleColor={colors.text + "22"}
      activeIndicatorColor={colors.primary + "22"}
    >
      <Tabs.Screen
        name="index"
        options={screenOptions.index}
      />
      <Tabs.Screen
        name="calendar"
        options={screenOptions.calendar}
      />
      <Tabs.Screen
        name="grades"
        options={screenOptions.grades}
      />
      <Tabs.Screen
        name="syllabus"
        options={screenOptions.syllabus}
      />
      <Tabs.Screen
        name="news"
        options={screenOptions.news}
      />
    </Tabs>
  );
}