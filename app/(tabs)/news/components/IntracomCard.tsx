import { Papicons } from '@getpapillon/papicons';
import { useTheme } from '@react-navigation/native';
import { LiquidGlassView } from '@sbaiahmed1/react-native-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { InteractionManager, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Collapsible from 'react-native-collapsible';
import MapView from 'react-native-maps';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { getIntracomToken } from '@/app/(modals)/login-intracom';
import DashedSeparator from '@/ui/components/DashedSeparator';
import Typography from '@/ui/components/Typography';
import { getProfileColorByName } from '@/utils/chats/colors';

// Types
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

interface IntracomCardProps {
    event: IntracomEvent;
}

const AnimatedView = Reanimated.createAnimatedComponent(View);

// Theme-aware colors
const getColors = (isDark: boolean) => ({
    primaryDark: isDark ? '#8dcfec' : '#004462',
    primaryBlue: isDark ? '#4db8e8' : '#0095d6',
    primaryBlueDark: isDark ? '#4db8e8' : '#0194d5',
    badgeBg: isDark ? 'rgba(77, 184, 232, 0.2)' : 'rgba(1, 148, 213, 0.15)',
    registerBg: 'rgba(4, 255, 0, 0.15)',
    gradientStart: isDark ? '#1a3a4a' : '#FFFFFF',
    gradientEnd: isDark ? '#0d2530' : '#8dcfec',
    cardBg: isDark ? '#1E1E1E' : '#FFFFFF',
    white: '#FFFFFF',
    buttonText: isDark ? '#FFFFFF' : '#004462',
    dashedBorder: isDark ? 'rgba(141, 207, 236, 0.5)' : 'rgba(0, 68, 98, 0.5)',
});

const IntracomCard: React.FC<IntracomCardProps> = ({ event }) => {
    const { dark, colors } = useTheme();
    const COLORS = getColors(dark);

    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [eventDetails, setEventDetails] = useState<IntracomEventDetails | null>(null);
    const [participants, setParticipants] = useState<IntracomParticipant[]>([]);
    const [slotTimes, setSlotTimes] = useState<{ start: string; end: string } | null>(null);

    // Animation values
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Format date as DD/MM/YY
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

    // Get event type label
    const getTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            FORUM_CPGE: "Forum CPGE",
            FORUM_HIGHSCHOOL: "Forum Lycée",
            FORUM_BAC: "Forum BAC",
            SALON: "Salon",
            JPO: "JPO",
            IMMERSIVE_DAY: "JI",
        };
        return types[type] || type;
    };

    // Parse event name to extract place name and city
    // After stripping event types and dates, format is typically: "CITY - PLACE NAME"
    const parseEventName = (name: string) => {
        const cleanName = name
            .replace(/\s*-?\s*Présentiel\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*Forum CPGE\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*Forum Lycée\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*Forum BAC\+?\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*FORUM LYCEE\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*FORUM CPGE\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*FORUM BAC\+?\s*-?\s*/gi, ' ')
            // Remove dates in format DD/MM/YYYY or DD/MM/YY
            .replace(/\s*-?\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*-?\s*/g, ' ')
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/^-\s*/, '') // Remove leading dash if any
            .replace(/\s*-$/, ''); // Remove trailing dash if any

        // After cleaning, expected format: "CITY - PLACE NAME"
        if (cleanName.includes(" - ")) {
            const parts = cleanName.split(" - ").filter(p => p.trim() !== '');
            if (parts.length >= 2) {
                // Format: CITY - PLACE NAME
                return {
                    city: parts[0].trim(),
                    placeName: parts.slice(1).join(" - ").trim(),
                };
            }
            return {
                city: null,
                placeName: parts[0]?.trim() || null,
            };
        }

        const match = cleanName.match(/^(.+?)\s*\((.+)\)$/);
        if (match) {
            return { city: match[2].trim(), placeName: match[1].trim() };
        }

        return { city: null, placeName: cleanName || null };
    };

    const { placeName, city } = parseEventName(event.name);

    // Format time from date string
    const formatTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'h');
        } catch {
            return '--h--';
        }
    };

    // End time fallback (2h after start)
    const getEndTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            date.setHours(date.getHours() + 2);
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'h');
        } catch {
            return '--h--';
        }
    };

    // Get first name from login
    const getFirstName = (login: string) => {
        const parts = login.split('.');
        if (parts.length > 0) {
            const firstName = parts[0];
            return firstName.charAt(0).toUpperCase() + firstName.slice(1);
        }
        return login;
    };

    // Fetch event details when expanded
    const fetchEventDetails = useCallback(async () => {
        const token = getIntracomToken();
        if (!token) {
            return;
        }

        setLoading(true);
        try {
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
                const allParticipants: IntracomParticipant[] = [];
                let firstStart: string | null = null;
                let lastEnd: string | null = null;

                slots.forEach((slotInfo) => {
                    slotInfo.jobs.forEach((job) => {
                        job.slots.forEach((slot) => {
                            if (!firstStart || slot.startTime < firstStart) {
                                firstStart = slot.startTime;
                            }
                            if (!lastEnd || slot.endTime > lastEnd) {
                                lastEnd = slot.endTime;
                            }
                            slot.groups.forEach((group) => {
                                group.participants.forEach((participant) => {
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
        } catch {
            // Error handling silently
        } finally {
            setLoading(false);
        }
    }, [event.id]);

    const handlePress = () => {
        if (!expanded) {
            // Defer fetch until animation completes for smoother open
            InteractionManager.runAfterInteractions(() => {
                fetchEventDetails();
            });
        }
        setExpanded(!expanded);
        scale.value = withSpring(0.97, { duration: 50 });
        setTimeout(() => {
            scale.value = withSpring(1, { duration: 200 });
        }, 50);
    };

    const openInMaps = () => {
        if (eventDetails?.latitude && eventDetails?.longitude) {
            const url = `https://maps.apple.com/?ll=${eventDetails.latitude},${eventDetails.longitude}&q=${encodeURIComponent(eventDetails.address + ', ' + eventDetails.town)}`;
            Linking.openURL(url);
        }
    };

    const displayStartTime = slotTimes ? formatTime(slotTimes.start) : formatTime(event.date);
    const displayEndTime = slotTimes ? formatTime(slotTimes.end) : getEndTime(event.date);

    return (
        <Pressable onPress={handlePress}>
            <AnimatedView style={[styles.cardContainer, { backgroundColor: COLORS.cardBg, borderColor: colors.border }, animatedStyle, expanded && { minHeight: 400 }]}>
                {/* Map Background (only when expanded) */}
                {expanded && eventDetails?.latitude && eventDetails?.longitude && (
                    <View style={[StyleSheet.absoluteFill, styles.mapContainer]}>
                        <MapView
                            style={StyleSheet.absoluteFill}
                            initialRegion={{
                                latitude: eventDetails.latitude,
                                longitude: eventDetails.longitude,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }}
                            scrollEnabled={false}
                            zoomEnabled={false}
                            pitchEnabled={false}
                            rotateEnabled={false}
                        />
                    </View>
                )}

                {/* Content Wrapper with Shared Gradient */}
                <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    locations={[0.18, 1]}
                    style={styles.gradientWrapper}
                >
                    {/* Header Row - Always visible */}
                    <View style={styles.headerRow}>
                        {/* Left: Event Info */}
                        <View style={styles.eventInfo}>
                            {/* Type Badge + Date */}
                            <View style={styles.badgeRow}>
                                <View style={[styles.typeBadge, { backgroundColor: COLORS.badgeBg }]}>
                                    <Typography variant="caption" style={[styles.badgeText, { color: COLORS.primaryBlue }]}>
                                        {getTypeLabel(event.type)}
                                    </Typography>
                                </View>
                                <View style={styles.dateRow}>
                                    <Papicons name="Calendar" size={18} color={COLORS.primaryBlueDark} />
                                    <Typography variant="caption" style={[styles.dateText, { color: COLORS.primaryBlueDark }]}>
                                        {formatDate(event.date)}
                                    </Typography>
                                </View>
                            </View>

                            {/* Title - Place Name (e.g., Lycée Leon Blum) */}
                            <Typography variant="h6" style={[styles.title, { color: COLORS.primaryDark }]} numberOfLines={2}>
                                {placeName || event.name}
                            </Typography>

                            {/* Location - City (e.g., Villefranche de Lauraguais) */}
                            {city && (
                                <View style={styles.locationRow}>
                                    <Papicons name="MapPin" size={15} color={COLORS.primaryBlueDark} />
                                    <Typography variant="caption" style={[styles.dateText, { color: COLORS.primaryBlueDark, flex: 1, flexShrink: 1 }]}>
                                        {city}
                                    </Typography>
                                </View>
                            )}
                        </View>

                        {/* Right: Time Range */}
                        <LiquidGlassView
                            glassType="regular"
                            glassTintColor="transparent"
                            glassOpacity={0}
                            style={styles.timeSection}
                        >
                            <View style={styles.timeWrapper}>
                                <Typography variant="h6" style={[styles.timeText, { color: COLORS.primaryDark }]}>
                                    {displayStartTime}
                                </Typography>
                            </View>
                            <Papicons name="ArrowDown" size={24} color={COLORS.primaryDark} />
                            <View style={styles.timeWrapper}>
                                <Typography variant="h6" style={[styles.timeText, { color: COLORS.primaryDark }]}>
                                    {displayEndTime}
                                </Typography>
                            </View>
                        </LiquidGlassView>
                    </View>

                    {/* Expanded Content */}
                    <Collapsible collapsed={!expanded} duration={280} easing="easeOutCubic">
                        {/* Dashed Separator */}
                        <DashedSeparator color={COLORS.dashedBorder} style={{ marginVertical: 7 }} />

                        {/* Participants Section */}
                        <View style={styles.participantsSection}>
                            <View style={styles.participantsHeader}>
                                <Papicons name="user" size={18} color={COLORS.primaryDark} />
                                <Typography variant="body1" style={[styles.participantsTitle, { color: COLORS.primaryDark }]}>
                                    Inscrits
                                </Typography>
                            </View>

                            {loading ? (
                                <Typography variant="caption" style={[styles.loadingText, { color: COLORS.primaryDark }]}>
                                    Chargement...
                                </Typography>
                            ) : participants.length > 0 ? (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    nestedScrollEnabled
                                    contentContainerStyle={styles.participantsScroll}
                                >
                                    {participants.map((participant) => (
                                        <View key={participant.id} style={styles.participantItem}>
                                            <View style={[styles.participantAvatar, { backgroundColor: getProfileColorByName(participant.login) }]}>
                                                <Papicons name="user" size={20} color={COLORS.white} />
                                            </View>
                                            <Typography variant="caption" style={[styles.participantName, { color: getProfileColorByName(participant.login) }]}>
                                                {getFirstName(participant.login)}
                                            </Typography>
                                        </View>
                                    ))}
                                </ScrollView>
                            ) : (
                                <Typography variant="caption" style={[styles.noParticipants, { color: COLORS.primaryDark }]}>
                                    Aucun inscrit pour le moment
                                </Typography>
                            )}
                        </View>
                    </Collapsible>
                </LinearGradient>

                {/* Action Buttons (only when expanded, outside gradient for map overlay) */}
                <Collapsible collapsed={!expanded} duration={280} easing="easeOutCubic">
                    <View style={styles.actionButtons}>
                        {/* Open in Maps Button (Liquid Glass) */}
                        {eventDetails?.latitude && eventDetails?.longitude && (
                            <Pressable onPress={openInMaps} style={styles.mapsButtonContainer}>
                                <LiquidGlassView
                                    glassType="regular"
                                    isInteractive={true}
                                    glassTintColor="transparent"
                                    glassOpacity={0}
                                    style={styles.mapsButton}
                                >
                                    <Papicons name="link" size={15} color={COLORS.buttonText} />
                                    <Typography variant="caption" style={[styles.mapsButtonText, { color: COLORS.buttonText }]}>
                                        Ouvrir dans maps
                                    </Typography>
                                </LiquidGlassView>
                            </Pressable>
                        )}
                    </View>
                </Collapsible>

                {/* Register Button (Liquid Glass, anchored to bottom) */}
                {expanded && (
                    <View style={styles.registerButtonContainer}>
                        <LiquidGlassView
                            glassType="regular"
                            isInteractive={true}
                            glassTintColor="transparent"
                            glassOpacity={0}
                            style={styles.registerButton}
                        >
                            <Papicons name="check" size={24} color={COLORS.buttonText} />
                            <Typography variant="body1" style={[styles.registerText, { color: COLORS.buttonText }]}>
                                M&apos;inscrire !
                            </Typography>
                        </LiquidGlassView>
                    </View>
                )}
            </AnimatedView>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        width: '100%',
        borderRadius: 25,
        borderCurve: 'continuous',
        overflow: 'hidden',
        borderWidth: 0.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 3.3,
        elevation: 3,
    },
    mapContainer: {
        minHeight: 550,
        top: 139,
        zIndex: 0,
    },
    gradientWrapper: {
        borderRadius: 25,
        zIndex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignSelf: 'stretch',
        padding: 13,
    },
    eventInfo: {
        flex: 1,
        gap: 10,
        justifyContent: 'space-between',
        alignSelf: 'stretch',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    typeBadge: {
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    badgeText: {
        fontWeight: '700',
        fontSize: 15,
        lineHeight: 15,
        letterSpacing: 0.2,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dateText: {
        fontWeight: '700',
        fontSize: 15,
        lineHeight: 18,
    },
    title: {
        fontWeight: '600',
        fontSize: 18,
        lineHeight: 22,
        letterSpacing: 0.2,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flex: 1,
    },
    timeSection: {
        borderRadius: 15,
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
        gap: 7,
        overflow: 'hidden',
    },
    timeWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeText: {
        fontWeight: '700',
        fontSize: 18,
        lineHeight: 18,
        letterSpacing: 0.2,
    },
    participantsSection: {
        padding: 10,
        gap: 13,
    },
    participantsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    participantsTitle: {
        fontWeight: '700',
        fontSize: 18,
        lineHeight: 18,
        letterSpacing: 0.2,
        flex: 1,
    },
    participantsScroll: {
        flexGrow: 1,
        paddingLeft: 4,
        gap: 7,
    },
    participantItem: {
        alignItems: 'center',
        gap: 4,
    },
    participantAvatar: {
        width: 35,
        height: 35,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    participantName: {
        fontWeight: '500',
        fontSize: 12,
        lineHeight: 12,
    },
    loadingText: {
        textAlign: 'center',
        opacity: 0.6,
    },
    noParticipants: {
        opacity: 0.5,
    },
    actionButtons: {
        padding: 13,
        gap: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
    },
    mapsButtonContainer: {
        alignSelf: 'flex-start',
    },
    mapsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        overflow: 'hidden',
    },
    mapsButtonText: {
        color: '#FFFFFF',
        fontWeight: '500',
        fontSize: 12,
        lineHeight: 12,
    },
    registerButtonContainer: {
        position: 'absolute',
        bottom: 13,
        left: 13,
        right: 13,
        zIndex: 10,
    },
    registerButton: {
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 11,
        alignSelf: 'stretch',
        overflow: 'hidden',
    },
    registerText: {
        color: '#FFFFFF',
        fontWeight: '500',
        fontSize: 19,
        lineHeight: 19,
    },
});

export default IntracomCard;
