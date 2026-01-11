import { Papicons } from '@getpapillon/papicons'
import { useFocusEffect, useTheme } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, View, Linking } from 'react-native'
import { useBottomTabBarHeight } from 'react-native-bottom-tabs'
import { RefreshControl } from 'react-native-gesture-handler'
import Reanimated, { LayoutAnimationConfig, useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
import { isIntracomConnected, getIntracomToken } from '@/app/(modals)/news'

import { LiquidGlassView } from '@sbaiahmed1/react-native-blur';
import { useTranslation } from 'react-i18next';
import ViewContainer from '@/ui/components/ViewContainer'

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

// Event details (full info)
interface IntracomEventDetails {
  id: number;
  title: string;
  campus: string;
  type: string;
  eventDate: string;
  state: string;
  address: string;
  zipcode: string;
  town: string;
  latitude: number;
  longitude: number;
}

// Slot infos (participants)
interface IntracomParticipant {
  id: number;
  login: string;
  isNew: boolean;
}

interface IntracomSlotGroup {
  id: number;
  nbStudent: number;
  groupSlug: string;
  participants: IntracomParticipant[];
}

interface IntracomSlot {
  id: number;
  startTime: string;
  endTime: string;
  groups: IntracomSlotGroup[];
}

interface IntracomJob {
  id: number;
  name: string;
  slots: IntracomSlot[];
}

interface IntracomSlotInfo {
  date: string;
  jobs: IntracomJob[];
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
    if (!token) return;

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
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isIntracomConnected()) {
        fetchIntracomEvents();
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
                      <IntracomEventCard key={event.id} event={event} />
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
// Intracom Event Card
const IntracomEventCard = ({ event }: { event: IntracomEvent }) => {
  const theme = useTheme();
  const colors = theme.colors as any;
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eventDetails, setEventDetails] = useState<IntracomEventDetails | null>(null);
  const [participants, setParticipants] = useState<IntracomParticipant[]>([]);
  const [slotTimes, setSlotTimes] = useState<{ start: string; end: string } | null>(null);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      FORUM_CPGE: "Forum CPGE",
      FORUM_HIGHSCHOOL: "Forum Lycée",
      FORUM_BAC: "Forum BAC",
      SALON: "Salon",
      JPO: "JPO",
    };
    return types[type] || type;
  };

  // Parse le nom pour extraire le titre et le lieu
  const parseEventName = (name: string) => {
    // Enlève "Présentiel" et les types de forum du nom
    let cleanName = name
      .replace(/\s*-?\s*Présentiel\s*-?\s*/gi, ' ')
      .replace(/\s*-?\s*Forum CPGE\s*-?\s*/gi, ' ')
      .replace(/\s*-?\s*Forum Lycée\s*-?\s*/gi, ' ')
      .replace(/\s*-?\s*Forum BAC\+?\s*-?\s*/gi, ' ')
      .trim();
    cleanName = cleanName.replace(/\s+/g, ' '); // Nettoie les espaces multiples

    // Essaie de séparer par " - " d'abord
    if (cleanName.includes(" - ")) {
      const parts = cleanName.split(" - ").filter(p => p.trim() !== '');
      return {
        title: parts[0].trim(),
        location: parts.slice(1).join(" - ").trim() || null,
      };
    }
    // Sinon essaie avec les parenthèses
    const match = cleanName.match(/^(.+?)\s*\((.+)\)$/);
    if (match) {
      return {
        title: match[1].trim(),
        location: match[2].trim(),
      };
    }
    // Sinon retourne juste le nom sans lieu
    return {
      title: cleanName,
      location: null,
    };
  };

  const { title: eventTitle, location: eventLocation } = parseEventName(event.name);

  const isOpen = event.state === "OPEN";
  const spotsLeft = event.maxStudents - event.registeredStudents;

  // Extrait l'heure de début depuis la date
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  // Heure de fin estimée (2h après le début par défaut)
  const getEndTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      date.setHours(date.getHours() + 2);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  // Extrait le prénom du login (format: prenom.nom)
  const getFirstName = (login: string) => {
    const parts = login.split('.');
    if (parts.length > 0) {
      const firstName = parts[0];
      return firstName.charAt(0).toUpperCase() + firstName.slice(1);
    }
    return login;
  };

  // Fetch les détails de l'event quand on expand
  const fetchEventDetails = async () => {
    const token = getIntracomToken();
    if (!token) return;

    setLoading(true);
    try {
      // Fetch les deux endpoints en parallèle
      const [detailsRes, slotsRes] = await Promise.all([
        fetch(`https://intracom.epita.fr/api/Events/${event.id}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`https://intracom.epita.fr/api/Events/${event.id}/SlotInfos`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (detailsRes.ok) {
        const details: IntracomEventDetails = await detailsRes.json();
        setEventDetails(details);
      }

      if (slotsRes.ok) {
        const slots: IntracomSlotInfo[] = await slotsRes.json();
        // Extraire tous les participants de tous les slots/groupes
        const allParticipants: IntracomParticipant[] = [];
        let firstStart: string | null = null;
        let lastEnd: string | null = null;

        slots.forEach((slotInfo) => {
          slotInfo.jobs.forEach((job) => {
            job.slots.forEach((slot) => {
              // Capturer les heures de début et fin
              if (!firstStart || slot.startTime < firstStart) {
                firstStart = slot.startTime;
              }
              if (!lastEnd || slot.endTime > lastEnd) {
                lastEnd = slot.endTime;
              }
              slot.groups.forEach((group) => {
                group.participants.forEach((participant) => {
                  // Éviter les doublons
                  if (!allParticipants.find(p => p.id === participant.id)) {
                    allParticipants.push(participant);
                  }
                });
              });
            });
          });
        });

        setParticipants(allParticipants);
        if (firstStart && lastEnd) {
          setSlotTimes({ start: firstStart, end: lastEnd });
        }
      }
    } catch (error) {
      console.error("[Intracom] Erreur fetch details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (!expanded) {
      fetchEventDetails();
    }
    setExpanded(!expanded);
  };

  const openInMaps = () => {
    if (eventDetails?.latitude && eventDetails?.longitude) {
      const url = `https://maps.apple.com/?ll=${eventDetails.latitude},${eventDetails.longitude}&q=${encodeURIComponent(eventDetails.address + ', ' + eventDetails.town)}`;
      Linking.openURL(url);
    }
  };

  // Utiliser les heures du slot si disponibles, sinon fallback
  const displayStartTime = slotTimes ? formatTime(slotTimes.start) : formatTime(event.date);
  const displayEndTime = slotTimes ? formatTime(slotTimes.end) : getEndTime(event.date);

  return (
    <Pressable onPress={handlePress}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          borderCurve: 'continuous',
          padding: 14,
          width: '100%',
          borderWidth: 1,
          borderColor: colors.border,
          opacity: isOpen ? 1 : 0.6,
        }}
      >
        {/* Partie principale */}
        <View style={{ flexDirection: 'row' }}>
          {/* Contenu principal à gauche */}
          <View style={{ flex: 1 }}>
            <Stack direction="horizontal" gap={6} style={{ marginBottom: 8, alignItems: 'center' }}>
              <View
                style={{
                  backgroundColor: colors.primary + "20",
                  borderRadius: 50,
                  borderCurve: 'continuous',
                  paddingHorizontal: 12,
                  paddingVertical: 3,
                }}
              >
                <Typography variant="caption" style={{ color: colors.primary, fontSize: 15, fontFamily: "Inter-Variable", fontWeight: "bold" }}>
                  {getTypeLabel(event.type)}
                </Typography>
              </View>
              <Papicons name="Calendar" size={14} color={colors.text} />
              <Typography variant="caption" style={{ color: colors.text, fontFamily: "Inter-Variable" }}>
                {formatDate(event.date)}
              </Typography>
            </Stack>

            <Typography variant="h6" numberOfLines={2} style={{ color: colors.text, marginBottom: 4, fontFamily: "Inter-Variable", fontWeight: "bold" }}>
              {eventTitle}
            </Typography>

            {eventLocation && (
              <Stack direction="horizontal" gap={4} style={{ marginBottom: 4, alignItems: 'center' }}>
                <Papicons name="MapPin" size={14} color={colors.text} />
                <Typography variant="caption" style={{ color: colors.text, fontFamily: "Inter-Variable" }}>
                  {eventLocation}
                </Typography>
              </Stack>
            )}

            <Stack direction="horizontal" gap={4} style={{ marginTop: 8, alignItems: 'center' }}>
              <Papicons name="user" size={14} color={colors.text + "60"} />
              <Typography variant="caption" color="secondary" style={{ fontFamily: "Inter-Variable" }}>
                {spotsLeft > 0 ? `${spotsLeft} place${spotsLeft > 1 ? "s" : ""} restante${spotsLeft > 1 ? "s" : ""}` : "Complet"}
              </Typography>
            </Stack>
          </View>

          {/* Barre verticale + horaires à droite */}
          <View
            style={{
              width: 1,
              backgroundColor: colors.border,
              marginHorizontal: 12,
            }}
          />
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="caption" style={{ color: colors.text, fontSize: 25, fontFamily: "Inter-Variable", fontWeight: "bold", lineHeight: 30, }}>
              {displayStartTime}
            </Typography>
            <Papicons name="ArrowDown" size={20} color={colors.text + "60"} style={{ marginVertical: 4 }} />
            <Typography variant="caption" style={{ color: colors.text, fontSize: 25, fontFamily: "Inter-Variable", fontWeight: "bold", lineHeight: 30, }}>
              {displayEndTime}
            </Typography>
          </View>
        </View>

        {/* Partie expandée */}
        {expanded && (
          <View style={{ marginTop: 14 }}>
            {loading ? (
              <Typography variant="caption" style={{ color: colors.text + "80", textAlign: 'center' }}>
                Chargement...
              </Typography>
            ) : (
              <>
                {/* Section Inscrits */}
                <View
                  style={{
                    backgroundColor: colors.overground,
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 12,
                  }}
                >
                  <Stack direction="horizontal" gap={6} style={{ marginBottom: 12, alignItems: 'center' }}>
                    <Papicons name="user" size={18} color={colors.primary} />
                    <Typography variant="body1" style={{ color: colors.primary, fontFamily: "Inter-Variable", fontWeight: "bold" }}>
                      Inscrits
                    </Typography>
                  </Stack>

                  {participants.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Stack direction="horizontal" gap={16}>
                        {participants.map((participant) => (
                          <View key={participant.id} style={{ alignItems: 'center' }}>
                            <View
                              style={{
                                width: 50,
                                height: 50,
                                borderRadius: 25,
                                backgroundColor: getProfileColorByName(participant.login),
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 3,
                                borderColor: getProfileColorByName(participant.login) + '40',
                              }}
                            >
                              <Papicons name="user" size={24} color="#FFFFFF" />
                            </View>
                            <Typography
                              variant="caption"
                              style={{
                                color: getProfileColorByName(participant.login),
                                fontFamily: "Inter-Variable",
                                fontWeight: "bold",
                                marginTop: 4,
                              }}
                            >
                              {getFirstName(participant.login)}
                            </Typography>
                          </View>
                        ))}
                      </Stack>
                    </ScrollView>
                  ) : (
                    <Typography variant="caption" style={{ color: colors.text + "60" }}>
                      Aucun inscrit pour le moment
                    </Typography>
                  )}
                </View>

                {/* Section Map */}
                {eventDetails?.latitude && eventDetails?.longitude && (
                  <Pressable
                    onPress={openInMaps}
                    style={{ borderRadius: 16, overflow: 'hidden' }}
                  >
                    <View
                      style={{
                        width: '100%',
                        height: 180,
                        borderRadius: 16,
                        backgroundColor: colors.border,
                        position: 'relative',
                      }}
                    >
                      {/* Image statique de la carte via MapBox Static API */}
                      <View
                        style={{
                          width: '100%',
                          height: '100%',
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: colors.overground,
                        }}
                      >
                        <View
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            backgroundColor: colors.primary + '20',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 8,
                          }}
                        >
                          <Papicons name="MapPin" size={28} color={colors.primary} />
                        </View>
                        <Typography variant="body2" style={{ color: colors.text, opacity: 0.7, fontFamily: "Inter-Variable" }}>
                          {eventDetails.address}
                        </Typography>
                        <Typography variant="caption" style={{ color: colors.text, opacity: 0.5, fontFamily: "Inter-Variable" }}>
                          {eventDetails.town}
                        </Typography>
                      </View>
                    </View>
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 10,
                        left: '50%',
                        transform: [{ translateX: -75 }],
                        backgroundColor: colors.card,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        elevation: 5,
                      }}
                    >
                      <Papicons name="Compass" size={16} color={colors.primary} />
                      <Typography variant="caption" style={{ color: colors.text, fontFamily: "Inter-Variable", fontWeight: "bold" }}>
                        Ouvrir dans maps
                      </Typography>
                    </View>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
};

export default NewsView