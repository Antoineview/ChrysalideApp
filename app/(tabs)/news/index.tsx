import { Papicons } from '@getpapillon/papicons'
import { useFocusEffect, useTheme } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native'
import { useBottomTabBarHeight } from 'react-native-bottom-tabs'
import { RefreshControl } from 'react-native-gesture-handler'
import Reanimated, { LayoutAnimationConfig, useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { getIntracomToken, isIntracomConnected } from '@/app/(modals)/login-intracom'
import News from '@/database/models/News'
import { useNews } from '@/database/useNews'
import { getManager, subscribeManagerUpdate } from '@/services/shared'
import AnimatedPressable from '@/ui/components/AnimatedPressable'
import Avatar from '@/ui/components/Avatar'
import { Dynamic } from '@/ui/components/Dynamic'
import Icon from '@/ui/components/Icon'
import Item, { Leading } from '@/ui/components/Item'
import Search from '@/ui/components/Search'
import Stack from '@/ui/components/Stack'
import TabHeader from '@/ui/components/TabHeader'
import TabHeaderTitle from '@/ui/components/TabHeaderTitle'
import Typography from '@/ui/components/Typography'
import { useKeyboardHeight } from '@/ui/hooks/useKeyboardHeight'
import { PapillonAppearIn, PapillonAppearOut } from '@/ui/utils/Transition'
import { getProfileColorByName } from '@/utils/chats/colors'
import { getInitials } from '@/utils/chats/initials'
import { warn } from '@/utils/logger/logger'

import IntracomCard from './components/IntracomCard'

// Events Intracom
interface IntracomEvent {
  id: number;
  date: string;
  type: string;
  name: string;
  campusSlug: string;
  registeredStudents: number;
  nbNewStudents: number;
  maxStudents: number;
  state: "OPEN" | "CLOSED";
}

const INTRACOM_EVENTS_URL = "https://intracom.epita.fr/api/Students/Events?EventType=[]&Restrict=true&Research=&PageSize=20&PageNumber=1";

const styles = StyleSheet.create({
  headerBtn: {
    width: "100%",
    flexDirection: "row",
    borderCurve: "continuous",
    borderRadius: 20,
    padding: 10,
    gap: 8
  }
});

const NewsView = () => {

  const { t } = useTranslation();

  const onPress = () => {
    router.push("/(modals)/news");
  };

  const theme = useTheme()
  const colors = theme.colors
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [headerHeight, setHeaderHeight] = useState(0)
  const bottomTabBarHeight = useBottomTabBarHeight();

  const [isLoading, setIsLoading] = useState(false)
  const [isManuallyLoading, setIsManuallyLoading] = useState(false)

  const keyboardHeight = useKeyboardHeight();

  const footerStyle = useAnimatedStyle(() => ({
    height: keyboardHeight.value - bottomTabBarHeight,
  }));

  const news = useNews();

  const [intracomEvents, setIntracomEvents] = useState<IntracomEvent[]>([]);
  const [intracomLoading, setIntracomLoading] = useState(false);

  const fetchIntracomEvents = useCallback(async () => {
    const token = getIntracomToken();
    if (!token) { return; }

    console.log("[Intracom] URL:", INTRACOM_EVENTS_URL);
    console.log("[Intracom] Token:", token);
    console.log("[Intracom] Bearer:", `Bearer ${token}`);

    try {
      setIntracomLoading(true);
      const response = await fetch(INTRACOM_EVENTS_URL, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setIntracomEvents(data.elemPage || []);
    } catch (error) {
      console.error("[Intracom] Erreur lors de la sync:", error);
    } finally {
      setIntracomLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isIntracomConnected()) {
      fetchIntracomEvents();
    } else {
      setIntracomEvents([]);
    }
  }, [isIntracomConnected()]);

  useFocusEffect(
    useCallback(() => {
      if (isIntracomConnected()) {
        fetchIntracomEvents();
      } else {
        setIntracomEvents([]);
      }
    }, [fetchIntracomEvents])
  );
  const sortedNews = useMemo(() => {
    return news.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [news]);

  const fetchNews = useCallback(() => {
    try {
      setIsLoading(true)
      const manager = getManager();
      if (!manager) {
        warn("Manager is null, skipping news fetch");
        return;
      }
      manager.getNews();
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setIsLoading(false)
      setIsManuallyLoading(false)
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeManagerUpdate((_) => {
      fetchNews();
    });

    return () => unsubscribe();
  }, []);

  const [searchText, setSearchText] = useState('');

  const filteredNews = useMemo(() => {
    return sortedNews.filter((news) => news.title?.toLowerCase().includes(searchText.toLowerCase()));
  }, [sortedNews, searchText]);

  return (
    <>
      < TabHeader
        onHeightChanged={setHeaderHeight}
        title={
          <TabHeaderTitle
            color={colors.primary}
            leading={t("Tab_News")}
            chevron={false}
            loading={isLoading}
          />
        }
        trailing={
          <AnimatedPressable onPressIn={onPress}>
            <Stack
              card
              style={{
                width: 42,
                height: 42,
                borderRadius: 30,
                marginRight: 16,
              }}
              hAlign='center'
              vAlign='center'
              noShadow
              backgroundColor='#FFFFFF50'
            >
              <Icon size={26} fill='white'>
                <Papicons name="newspaper" />
              </Icon>
            </Stack>
          </AnimatedPressable>
        }
        bottom={
          <View style={{ gap: 10, width: '100%', paddingHorizontal: 16 }}>
            <Search placeholder={t('News_Search_Placeholder')} color='#2B7ED6' onTextChange={(text) => setSearchText(text)} />
          </View>
        }
      />
      <LayoutAnimationConfig skipEntering>
        <FlatList
          contentContainerStyle={{
            paddingBottom: insets.bottom + bottomTabBarHeight,
            paddingHorizontal: 16,
            gap: 9,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isManuallyLoading}
              onRefresh={() => {
                setIsManuallyLoading(true)
                fetchNews()
                fetchIntracomEvents()
              }}
              progressViewOffset={headerHeight}
            />
          }
          data={filteredNews}
          keyExtractor={(item: any) => item.id}
          ListFooterComponent={<Reanimated.View style={footerStyle} />}
          renderItem={({ item }) => <NewsItem item={item} />}
          scrollIndicatorInsets={{ top: headerHeight - insets.top }}
          ListHeaderComponent={
            <View style={{ paddingTop: headerHeight }}>
              {isIntracomConnected() && intracomEvents.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Typography variant="h5" style={{ marginBottom: 10, color: colors.text }}>
                    Événements Intracom
                  </Typography>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}
                  >
                    {intracomEvents.filter((event) => event.state === "OPEN").map((event) => (
                      <IntracomCard key={event.id} event={event} />
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !isIntracomConnected() || intracomEvents.length === 0 ? (
              <Dynamic animated key={'empty-list:warn'} entering={PapillonAppearIn} exiting={PapillonAppearOut}>
                <Stack
                  hAlign="center"
                  vAlign="center"
                  flex
                  style={{ width: "100%", marginTop: 16 }}
                >
                  <Icon opacity={0.5} size={32} style={{ marginBottom: 3 }}>
                    <Papicons name={searchText ? "Search" : "Newspaper"} />
                  </Icon>
                  <Typography variant="h4" color="text" align="center">
                    {searchText ? t('News_Search_NoResults') : t('News_Empty_Title')}
                  </Typography>
                  <Typography variant="body2" color="secondary" align="center">
                    {searchText ? t('News_Search_NoResults_Description') : t('News_Empty_Description')}
                  </Typography>
                </Stack>
              </Dynamic>
            ) : null
          }
        />
      </LayoutAnimationConfig>
    </>
  )
}

const NewsItem = ({ item }: { item: News }) => {
  const router = useRouter()

  const profileColor = useMemo(() => getProfileColorByName(item.author), [item.author]);
  const profileInitials = useMemo(() => getInitials(item.author), [item.author]);

  return (
    <AnimatedPressable
      onPress={() => router.push({
        pathname: "/(modals)/news",
        params: { news: JSON.stringify(item) },
      })}
    >
      <Stack card>
        <Item isLast>
          <Leading>
            <Avatar
              size={40}
              color={profileColor}
              initials={profileInitials}
            />
          </Leading>

          <Typography variant='title' numberOfLines={2}>
            {item.title}
          </Typography>
          <Typography variant='body1' color='secondary' numberOfLines={3}>
            {item.content ? truncateString(cleanContent(item.content), 100) : ""}
          </Typography>


          <Stack
            direction='horizontal'
            gap={4}
            style={{ marginTop: 4 }}
            hAlign='center'
          >
            <Typography nowrap weight='medium' style={{ flex: 1 }} variant='caption' color='secondary'>
              {item.author}
            </Typography>

            <Typography nowrap weight='medium' variant='caption' color='secondary'>
              {new Date(item.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Typography>

            {item.attachments.length > 0 && (
              <Icon size={18} opacity={0.4}>
                <Papicons name={"link"} />
              </Icon>
            )}
          </Stack>
        </Item>
      </Stack>
    </AnimatedPressable>
  )
}

function cleanContent(html: string): string {
  html = html.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  html = html.replace(/\n/g, " ");
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength) + "...";
}

export default NewsView