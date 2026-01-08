import { Papicons } from '@getpapillon/papicons';
import { LegendList } from '@legendapp/list';
import { useRouter } from 'expo-router';
import { t } from 'i18next';
import React, { useEffect } from 'react';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAccountStore } from '@/stores/account';

import HomeHeader from './atoms/HomeHeader';
import HomeTopBar from './atoms/HomeTopBar';
import Wallpaper from './atoms/Wallpaper';
import HomeWidget, { HomeWidgetItem } from './components/HomeWidget';
import { useHomeData } from './hooks/useHomeData';
import HomeTimeTableWidget from './widgets/timetable';

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const bottomTabBarHeight = useBottomTabBarHeight();

  // Account
  const accounts = useAccountStore((state) => state.accounts);
  const router = useRouter();

  // Redirect to onboarding if no accounts exist
  useEffect(() => {
    if (accounts.length === 0) {
      router.replace("/(onboarding)/welcome");
    }
  }, [accounts.length, router]);

  // Prevent flash of home content while redirecting
  if (accounts.length === 0) {
    return null;
  }

  useHomeData();

  const renderTimeTable = React.useCallback(() => <HomeTimeTableWidget />, []);

  const data: HomeWidgetItem[] = React.useMemo(() => [
    {
      icon: <Papicons name={"Calendar"} />,
      title: t("Home_Widget_NextCourses"),
      redirect: "(tabs)/calendar",
      render: renderTimeTable
    },
  ], [renderTimeTable]);

  return (
    <>
      <Wallpaper />
      <HomeTopBar />
      <LegendList
        renderItem={({ item }) => <HomeWidget item={item} />}
        keyExtractor={(item) => item.title}
        ListHeaderComponent={<HomeHeader />}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + bottomTabBarHeight,
          paddingHorizontal: 16,
        }}
        data={data}
      />
    </>
  );
};

export default HomeScreen;