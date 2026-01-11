import { Papicons } from '@getpapillon/papicons';
import { useTheme } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
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

const IntracomCard: React.FC<IntracomCardProps> = ({ event }) => {
    const { colors } = useTheme();
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
        };
        return types[type] || type;
    };

    // Parse event name to extract title and location
    const parseEventName = (name: string) => {
        const cleanName = name
            .replace(/\s*-?\s*Présentiel\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*Forum CPGE\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*Forum Lycée\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*Forum BAC\+?\s*-?\s*/gi, ' ')
            .trim()
            .replace(/\s+/g, ' ');

        if (cleanName.includes(" - ")) {
            const parts = cleanName.split(" - ").filter(p => p.trim() !== '');
            return {
                title: parts[0].trim(),
                location: parts.slice(1).join(" - ").trim() || null,
            };
        }

        const match = cleanName.match(/^(.+?)\s*\((.+)\)$/);
        if (match) {
            return { title: match[1].trim(), location: match[2].trim() };
        }

        return { title: cleanName, location: null };
    };

    const { title: eventTitle, location: eventLocation } = parseEventName(event.name);

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
            <AnimatedView style={[styles.cardContainer, animatedStyle]}>
                {/* Map Background (only when expanded) */}
                {expanded && eventDetails?.latitude && eventDetails?.longitude && (
                    <View style={[StyleSheet.absoluteFill, { minHeight: 350 }]}>
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
                        <LinearGradient
                            colors={[colors.primary, 'rgba(255, 255, 255, 0.01)']}
                            locations={[0.27, 0.6]}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                )}

                {/* Solid background when closed or no map */}
                {(!expanded || !eventDetails?.latitude || !eventDetails?.longitude) && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary, borderRadius: 25 }]} />
                )}

                {/* Main Content */}
                <View style={[styles.content, expanded && eventDetails?.latitude ? { minHeight: 350 } : undefined]}>
                    {/* Header Row */}
                    <View style={styles.headerRow}>
                        {/* Left: Event Info */}
                        <View style={styles.eventInfo}>
                            {/* Type Badge + Date */}
                            <View style={styles.badgeRow}>
                                <View style={styles.typeBadge}>
                                    <Typography variant="caption" style={[styles.badgeText, { color: colors.primary }]}>
                                        {getTypeLabel(event.type)}
                                    </Typography>
                                </View>
                                <View style={styles.dateRow}>
                                    <Papicons name="Calendar" size={18} color="#FFFFFF" />
                                    <Typography variant="caption" style={styles.whiteText}>
                                        {formatDate(event.date)}
                                    </Typography>
                                </View>
                            </View>

                            {/* Title */}
                            <Typography variant="h6" style={styles.title} numberOfLines={2}>
                                {eventTitle}
                            </Typography>

                            {/* Location */}
                            {eventLocation && (
                                <View style={styles.locationRow}>
                                    <Papicons name="MapPin" size={18} color="#FFFFFF" />
                                    <Typography variant="caption" style={styles.whiteText}>
                                        {eventLocation}
                                    </Typography>
                                </View>
                            )}
                        </View>

                        {/* Separator */}
                        <View style={styles.separator} />

                        {/* Right: Time Range */}
                        <View style={styles.timeSection}>
                            <Typography variant="h6" style={styles.timeText}>
                                {displayStartTime}
                            </Typography>
                            <Papicons name="ArrowDown" size={24} color="rgba(255, 255, 255, 0.6)" />
                            <Typography variant="h6" style={styles.timeText}>
                                {displayEndTime}
                            </Typography>
                        </View>
                    </View>

                    {/* Expanded Content with Collapsible */}
                    <Collapsible collapsed={!expanded} duration={280} easing="easeOutCubic">
                        <View style={styles.expandedContent}>
                            {loading ? (
                                <Typography variant="caption" style={styles.loadingText}>
                                    Chargement...
                                </Typography>
                            ) : (
                                <>
                                    {/* Participants Section */}
                                    <View style={styles.participantsCard}>
                                        <View style={styles.participantsHeader}>
                                            <Papicons name="user" size={18} color={colors.primary} />
                                            <Typography variant="body1" style={[styles.participantsTitle, { color: colors.primary }]}>
                                                Inscrits
                                            </Typography>
                                        </View>

                                        {participants.length > 0 ? (
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                nestedScrollEnabled
                                                contentContainerStyle={{ flexGrow: 1 }}
                                            >
                                                <View style={{ flexDirection: 'row', gap: 10, paddingLeft: 4 }}>
                                                    {participants.map((participant) => (
                                                        <View key={participant.id} style={styles.participantItem}>
                                                            <View style={[styles.participantAvatar, { backgroundColor: getProfileColorByName(participant.login) }]}>
                                                                <Papicons name="user" size={20} color="#FFFFFF" />
                                                            </View>
                                                            <Typography variant="caption" style={[styles.participantName, { color: getProfileColorByName(participant.login) }]}>
                                                                {getFirstName(participant.login)}
                                                            </Typography>
                                                        </View>
                                                    ))}
                                                </View>
                                            </ScrollView>
                                        ) : (
                                            <Typography variant="caption" style={styles.noParticipants}>
                                                Aucun inscrit pour le moment
                                            </Typography>
                                        )}
                                    </View>

                                    {/* Open in Maps Button (Liquid Glass) */}
                                    {eventDetails?.latitude && eventDetails?.longitude && (
                                        <Pressable onPress={openInMaps} style={styles.mapsButtonContainer}>
                                            <BlurView intensity={80} tint="light" style={styles.mapsButton}>
                                                <Papicons name="link" size={15} color="#FFFFFF" />
                                                <Typography variant="caption" style={styles.mapsButtonText}>
                                                    Ouvrir dans maps
                                                </Typography>
                                            </BlurView>
                                        </Pressable>
                                    )}
                                </>
                            )}
                        </View>
                    </Collapsible>
                </View>
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 3.3,
        elevation: 3,
    },
    content: {
        padding: 13,
        gap: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eventInfo: {
        flex: 1,
        gap: 7,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    typeBadge: {
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    badgeText: {
        fontFamily: 'Inter-Variable',
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
    whiteText: {
        color: '#FFFFFF',
        fontFamily: 'Inter-Variable',
        fontWeight: '500',
        fontSize: 15,
        lineHeight: 15,
    },
    title: {
        color: '#FFFFFF',
        fontFamily: 'Inter-Variable',
        fontWeight: '700',
        fontSize: 18,
        lineHeight: 18,
        letterSpacing: 0.2,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    separator: {
        width: 2,
        alignSelf: 'stretch',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 267,
        marginHorizontal: 14,
    },
    timeSection: {
        width: 65,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
    },
    timeText: {
        color: '#FFFFFF',
        fontFamily: 'Inter-Variable',
        fontWeight: '700',
        fontSize: 18,
        lineHeight: 18,
        textAlign: 'center',
        letterSpacing: 0.2,
    },
    expandedContent: {
        gap: 12,
        paddingTop: 12,
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
    },
    participantsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        padding: 10,
        gap: 13,
    },
    participantsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    participantsTitle: {
        fontFamily: 'Inter-Variable',
        fontWeight: '700',
        fontSize: 18,
        lineHeight: 18,
        letterSpacing: 0.2,
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
        fontFamily: 'Inter-Variable',
        fontWeight: '500',
        fontSize: 12,
        lineHeight: 12,
    },
    noParticipants: {
        color: 'rgba(0, 0, 0, 0.5)',
    },
    mapsButtonContainer: {
        alignSelf: 'center',
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
        fontFamily: 'Inter-Variable',
        fontWeight: '500',
        fontSize: 12,
        lineHeight: 12,
    },
});

export default IntracomCard;
