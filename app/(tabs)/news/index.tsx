import { Papicons } from '@getpapillon/papicons'
import { useFocusEffect, useTheme } from '@react-navigation/native'
import { LiquidGlassContainer } from '@sbaiahmed1/react-native-blur';
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, View } from 'react-native'
import { useBottomTabBarHeight } from 'react-native-bottom-tabs'
import { RefreshControl } from 'react-native-gesture-handler'
import Reanimated, { LayoutAnimationConfig, useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { getIntracomToken } from '@/app/(modals)/login-intracom'
import News from '@/database/models/News'
import { cleanupOldIntracomEvents, fetchIntracomBonus, getIntracomEventsFromCache, getRegisteredIntracomEventsFromCache, saveIntracomEventsToDatabase, saveRegisteredIntracomEvents } from '@/database/useIntracomEvents'
import { useNews } from '@/database/useNews'
import { getManager, subscribeManagerUpdate } from '@/services/shared'
import { useAccountStore } from '@/stores/account'
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

import IntracomBonusWidget from './components/IntracomBonusWidget'
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
  // Location fields (optional, fetched from event details)
  address?: string;
  zipcode?: string;
  town?: string;
  latitude?: number;
  longitude?: number;
  slotTimes?: string;
  participants?: string;
  bonus?: number;
}

const INTRACOM_EVENTS_URL = "https://intracom.epita.fr/api/Students/Events?EventType=[]&Restrict=true&Research=&PageSize=20&PageNumber=1";


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
  const lastUsedAccount = useAccountStore((s) => s.lastUsedAccount);

  const [intracomEvents, setIntracomEvents] = useState<IntracomEvent[]>([]);
  const [registeredIntracomEvents, setRegisteredIntracomEvents] = useState<IntracomEvent[]>([]);

  const [intracomLoading, setIntracomLoading] = useState(false);

  const fetchIntracomEvents = useCallback(async () => {
    const token = getIntracomToken();
    const accountId = lastUsedAccount || 'default';

    // Always try to load from cache first
    const cachedEvents = await getIntracomEventsFromCache(accountId);
    if (cachedEvents.length > 0) {
      setIntracomEvents(cachedEvents);
    }

    const cachedRegistered = await getRegisteredIntracomEventsFromCache(accountId);
    if (cachedRegistered.length > 0) {
      setRegisteredIntracomEvents(cachedRegistered);
    }


    // If no token, don't try to fetch from API
    if (!token) { return; }

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
      const events: IntracomEvent[] = data.elemPage || [];

      // Fetch details for each event (location + slots)
      const eventsWithDetails = await Promise.all(
        events.map(async (event) => {
          let updatedEvent = { ...event };

          try {
            // 1. Fetch Location Details
            const detailsRes = await fetch(`https://intracom.epita.fr/api/Events/${event.id}`, {
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (detailsRes.ok) {
              const details = await detailsRes.json();
              updatedEvent = {
                ...updatedEvent,
                address: details.address,
                zipcode: details.zipcode,
                town: details.town,
                latitude: details.latitude,
                longitude: details.longitude,
              };
            }

            // 2. Fetch Slot Infos (Participants & Times)
            const slotsRes = await fetch(`https://intracom.epita.fr/api/Events/${event.id}/SlotInfos`, {
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (slotsRes.ok) {
              const slots: any[] = await slotsRes.json();
              const allParticipants: any[] = [];
              let firstStart: string | null = null;
              let lastEnd: string | null = null;

              slots.forEach((slotInfo) => {
                slotInfo.jobs?.forEach((job: any) => {
                  job.slots?.forEach((slot: any) => {
                    if (!firstStart || slot.startTime < firstStart) {
                      firstStart = slot.startTime;
                    }
                    if (!lastEnd || slot.endTime > lastEnd) {
                      lastEnd = slot.endTime;
                    }
                    slot.groups?.forEach((group: any) => {
                      group.participants?.forEach((participant: any) => {
                        if (!allParticipants.find(p => p.id === participant.id)) {
                          allParticipants.push(participant);
                        }
                      });
                    });
                  });
                });
              });

              if (allParticipants.length > 0) {
                updatedEvent.participants = JSON.stringify(allParticipants);
              }
              if (firstStart && lastEnd) {
                updatedEvent.slotTimes = JSON.stringify({ start: firstStart, end: lastEnd });
              }
            }

          } catch {
            // On error, return partial event
          }
          return updatedEvent;
        })
      );

      setIntracomEvents(eventsWithDetails);

      // Save to database (including location details)
      if (eventsWithDetails.length > 0) {
        await saveIntracomEventsToDatabase(eventsWithDetails, accountId);
        await cleanupOldIntracomEvents(accountId);
      }

      // 4. Fetch Bonus Points & History
      if (token) {
        await fetchIntracomBonus(token);
        // 5. Fetch Registered Events
        const registeredRes = await fetch(`https://intracom.epita.fr/api/Students/RegisteredEvents?EventType=[]&Research=&PageSize=20&PageNumber=1`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (registeredRes.ok) {
          const registeredData = await registeredRes.json();
          const registeredEvents: IntracomEvent[] = registeredData.elemPage || [];

          // Filter to only keep OPEN events logic as per user request for sync
          // "The inscrits events should only be the ones which have the OPEN state."
          // "database removes the events that are not open anymore on each sync"
          const openRegisteredEvents = registeredEvents.filter(e => e.state === 'OPEN');

          // Fetch details for each registered event (location + slots)
          const registeredEventsWithDetails = await Promise.all(
            openRegisteredEvents.map(async (event) => {
              let updatedEvent = { ...event };
              try {
                // Address
                const detailsRes = await fetch(`https://intracom.epita.fr/api/Events/${event.id}`, {
                  headers: { "Authorization": `Bearer ${token}` }
                });
                if (detailsRes.ok) {
                  const d = await detailsRes.json();
                  updatedEvent = { ...updatedEvent, address: d.address, zipcode: d.zipcode, town: d.town, latitude: d.latitude, longitude: d.longitude };
                }

                // Participants/Slots
                const slotsRes = await fetch(`https://intracom.epita.fr/api/Events/${event.id}/SlotInfos`, {
                  headers: { "Authorization": `Bearer ${token}` }
                });
                if (slotsRes.ok) {
                  const s = await slotsRes.json();
                  const allParticipants: any[] = [];
                  let firstStart: string | null = null;
                  let lastEnd: string | null = null;
                  s.forEach((slotInfo: any) => {
                    slotInfo.jobs?.forEach((job: any) => {
                      job.slots?.forEach((slot: any) => {
                        if (!firstStart || slot.startTime < firstStart) { firstStart = slot.startTime; }
                        if (!lastEnd || slot.endTime > lastEnd) { lastEnd = slot.endTime; }
                        slot.groups?.forEach((group: any) => {
                          group.participants?.forEach((participant: any) => {
                            if (!allParticipants.find(p => p.id === participant.id)) { allParticipants.push(participant); }
                          });
                        });
                      });
                    });
                  });
                  if (allParticipants.length > 0) { updatedEvent.participants = JSON.stringify(allParticipants); }
                  if (firstStart && lastEnd) { updatedEvent.slotTimes = JSON.stringify({ start: firstStart, end: lastEnd }); }
                }
              } catch { }
              return updatedEvent;
            })
          );

          setRegisteredIntracomEvents(registeredEventsWithDetails);
          // Persist
          await saveRegisteredIntracomEvents(registeredEventsWithDetails, accountId);
        }

      }

    } catch (error) {
      warn(`[Intracom] Erreur lors de la sync: ${error}`);
      // On error, keep showing cached events (already loaded above)
    } finally {
      setIntracomLoading(false);
    }
  }, [lastUsedAccount]);

  useEffect(() => {
    fetchIntracomEvents();
  }, [fetchIntracomEvents]);

  useFocusEffect(
    useCallback(() => {
      fetchIntracomEvents();
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
      <TabHeader
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
          <LiquidGlassContainer>
            <AnimatedPressable onPressIn={onPress}>
              <Stack
                card
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 30,
                }}
                hAlign='center'
                vAlign='center'
                noShadow
              >
                <Icon size={26} fill={colors.text}>
                  <Papicons name="newspaper" />
                </Icon>
              </Stack>
            </AnimatedPressable>
          </LiquidGlassContainer>

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
                const token = getIntracomToken();
                if (token) { fetchIntracomBonus(token); }
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
            <View style={{ paddingTop: headerHeight, gap: 16 }}>
              <IntracomBonusWidget />
              {registeredIntracomEvents.length > 0 && (
                <View style={{ marginBottom: 0 }}>
                  <Typography variant="h5" style={{ marginBottom: 10, color: colors.text }}>
                    Inscrits
                  </Typography>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}
                  >
                    {registeredIntracomEvents.map((event) => (
                      <IntracomCard key={`reg-${event.id}`} event={event} hideRegisterButton />
                    ))}
                  </ScrollView>

                </View>
              )}

              {intracomEvents.length > 0 && (
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
            intracomEvents.length === 0 ? (
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