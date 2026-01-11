import { Papicons } from '@getpapillon/papicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import Reanimated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { getIntracomToken } from '@/app/(modals)/login-intracom';
import Button from '@/ui/components/Button';
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

// Colors from Figma
const COLORS = {
    primaryDark: '#004462',
    primaryBlue: '#0095d6',
    primaryBlueDark: '#0194d5',
    badgeBg: 'rgba(1, 148, 213, 0.15)',
    registerBg: 'rgba(4, 255, 0, 0.15)',
    gradientEnd: '#8dcfec',
    white: '#FFFFFF',
    dashedBorder: 'rgba(0, 68, 98, 0.5)',
};

const IntracomCard: React.FC<IntracomCardProps> = ({ event }) => {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [eventDetails, setEventDetails] = useState<IntracomEventDetails | null>(null);
    const [participants, setParticipants] = useState<IntracomParticipant[]>([]);
    const [slotTimes, setSlotTimes] = useState<{ start: string; end: string } | null>(null);
    const [showMap, setShowMap] = useState(false);

    // Animation values
    const scale = useSharedValue(1);

    // Split heights
    const participantsHeight = useSharedValue(0);
    const buttonsHeight = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Height animation style for Participants (Gradient)
    const animatedParticipantsStyle = useAnimatedStyle(() => ({
        height: participantsHeight.value,
        opacity: participantsHeight.value === 0 ? 0 : 1,
    }));

    // Height animation style for Buttons (Map Overlay)
    const animatedButtonsStyle = useAnimatedStyle(() => ({
        height: buttonsHeight.value,
        opacity: buttonsHeight.value === 0 ? 0 : 1,
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
        // Optimization: Use cached data if available
        if (eventDetails) {
            return;
        }

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
    }, [event.id, eventDetails]);

    const onCollapseComplete = useCallback(() => {
        setShowMap(false);
    }, []);

    // Split Measurement Refs/State
    const [measuredParticipantsH, setMeasuredParticipantsH] = useState(0);
    const [measuredButtonsH, setMeasuredButtonsH] = useState(0);

    const handlePress = () => {
        const targetExpanded = !expanded;
        setExpanded(targetExpanded);

        scale.value = withSpring(0.97, { duration: 50 });
        setTimeout(() => {
            scale.value = withSpring(1, { duration: 200 });
        }, 50);

        if (targetExpanded) {
            // Expand
            // Optimization: Parallel Load - Start fetching and mounting map immediately
            setShowMap(true);
            fetchEventDetails();

            // Synchronize both animations
            const config = { duration: 300, easing: Easing.out(Easing.poly(3)) };

            participantsHeight.value = withTiming(measuredParticipantsH, config);

            buttonsHeight.value = withTiming(measuredButtonsH, config); // Removed callback, handled by immediate call above

        } else {
            // Collapse
            const config = { duration: 300, easing: Easing.out(Easing.poly(3)) };

            participantsHeight.value = withTiming(0, config);

            buttonsHeight.value = withTiming(0, config, (finished) => {
                if (finished) { runOnJS(onCollapseComplete)(); }
            });
        }
    };

    const onParticipantsLayout = useCallback((event: LayoutChangeEvent) => {
        const height = event.nativeEvent.layout.height;
        if (height > 0 && Math.abs(measuredParticipantsH - height) > 1) {
            setMeasuredParticipantsH(height);
            // If already expanded, update height
            if (expanded) {
                participantsHeight.value = withTiming(height, { duration: 200 });
            }
        }
    }, [expanded, measuredParticipantsH, participantsHeight]);

    const onButtonsLayout = useCallback((event: LayoutChangeEvent) => {
        const height = event.nativeEvent.layout.height;
        if (height > 0 && Math.abs(measuredButtonsH - height) > 1) {
            setMeasuredButtonsH(height);
            // If already expanded, update height
            if (expanded) {
                buttonsHeight.value = withTiming(height, { duration: 200 });
            }
        }
    }, [expanded, measuredButtonsH, buttonsHeight]);


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
            <AnimatedView style={[styles.cardContainer, animatedStyle, expanded && { minHeight: 400 }]}>
                {/* Map Background (only when expanded AND after animation) */}
                {showMap && expanded && eventDetails?.latitude && eventDetails?.longitude && (
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

                {/* 1. Gradient Section (Header + Participants) */}
                <LinearGradient
                    colors={[COLORS.white, COLORS.gradientEnd]}
                    locations={[0.18, 1]}
                    style={styles.gradientWrapper}
                >
                    {/* Header Row - Always visible */}
                    <View style={styles.headerRow}>
                        {/* Left: Event Info */}
                        <View style={styles.eventInfo}>
                            {/* Type Badge + Date */}
                            <View style={styles.badgeRow}>
                                <View style={styles.typeBadge}>
                                    <Typography variant="caption" style={styles.badgeText}>
                                        {getTypeLabel(event.type)}
                                    </Typography>
                                </View>
                                <View style={styles.dateRow}>
                                    <Papicons name="Calendar" size={18} color={COLORS.primaryBlueDark} />
                                    <Typography variant="caption" style={styles.dateText}>
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
                                    <Papicons name="MapPin" size={18} color={COLORS.primaryBlueDark} />
                                    <Typography variant="caption" style={styles.dateText}>
                                        {eventLocation}
                                    </Typography>
                                </View>
                            )}
                        </View>

                        {/* Right: Time Range */}
                        <View style={styles.timeSection}>
                            <View style={styles.timeWrapper}>
                                <Typography variant="h6" style={styles.timeText}>
                                    {displayStartTime}
                                </Typography>
                            </View>
                            <Papicons name="ArrowDown" size={24} color={COLORS.primaryDark} />
                            <View style={styles.timeWrapper}>
                                <Typography variant="h6" style={styles.timeText}>
                                    {displayEndTime}
                                </Typography>
                            </View>
                        </View>
                    </View>

                    {/* Participants SECTION (Inside Gradient) */}
                    <Reanimated.View style={[styles.expandWrapper, animatedParticipantsStyle]}>
                        {/* Measurement Container */}
                        <View style={styles.measureContainer} onLayout={onParticipantsLayout}>
                            {/* Dashed Separator */}
                            <DashedSeparator color={COLORS.dashedBorder} style={{ marginVertical: 7 }} />

                            {/* Participants List */}
                            <View style={styles.participantsSection}>
                                <View style={styles.participantsHeader}>
                                    <Papicons name="user" size={18} color={COLORS.primaryDark} />
                                    <Typography variant="body1" style={styles.participantsTitle}>
                                        Inscrits
                                    </Typography>
                                </View>

                                {loading ? (
                                    <Typography variant="caption" style={styles.loadingText}>
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
                                    <Typography variant="caption" style={styles.noParticipants}>
                                        Aucun inscrit pour le moment
                                    </Typography>
                                )}
                            </View>
                            <View style={{ height: 10 }} />
                        </View>
                    </Reanimated.View>
                </LinearGradient>

                {/* 2. Buttons SECTION (Outside Gradient, On Map) */}
                <Reanimated.View style={[styles.expandWrapper, animatedButtonsStyle]}>
                    <View style={styles.measureContainer} onLayout={onButtonsLayout}>
                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            {/* Open in Maps Button */}
                            {eventDetails?.latitude && eventDetails?.longitude && (
                                <View style={styles.mapsButtonContainer}>
                                    <BlurView
                                        intensity={80}
                                        tint="light"
                                        style={styles.mapsButtonWrapper}
                                    >
                                        <Button
                                            variant="primary" // Keeping primary for text color logic
                                            size="small"
                                            title="Ouvrir dans maps"
                                            icon={<Papicons name="link" size={15} color={COLORS.white} />}
                                            onPress={openInMaps}
                                            style={[styles.mapsButton, { backgroundColor: 'rgba(0, 68, 98, 0.4)' }]}
                                        />
                                    </BlurView>
                                </View>
                            )}
                        </View>

                        {/* Register Button */}
                        <View style={styles.registerButtonContainer}>
                            <BlurView
                                intensity={80}
                                tint="light"
                                style={styles.registerButtonWrapper}
                            >
                                <Button
                                    variant="primary"
                                    title="M'inscrire !"
                                    icon={<Papicons name="check" size={24} color={COLORS.white} />}
                                    style={[styles.registerButton, { backgroundColor: 'rgba(0, 149, 214, 0.4)' }]}
                                />
                            </BlurView>
                        </View>

                        <View style={{ height: 16 }} />
                    </View>
                </Reanimated.View>

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
        backgroundColor: COLORS.white,
    },
    mapContainer: {
        minHeight: 550,
        top: 139,
        zIndex: 0,
    },
    gradientWrapper: {
        borderRadius: 25,
        borderCurve: 'continuous',
        zIndex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignSelf: 'stretch',
        padding: 13,
    },
    eventInfo: {
        flex: 1,
        gap: 7,
        justifyContent: 'space-between',
        alignSelf: 'stretch',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    typeBadge: {
        backgroundColor: COLORS.badgeBg,
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    badgeText: {
        color: COLORS.primaryBlue,
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
        color: COLORS.primaryBlueDark,
        fontWeight: '700',
        fontSize: 15,
        lineHeight: 15,
    },
    title: {
        color: COLORS.primaryDark,
        fontWeight: '600',
        fontSize: 18,
        lineHeight: 22,
        letterSpacing: 0.2,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    timeSection: {
        borderWidth: 2,
        borderColor: COLORS.primaryDark,
        borderRadius: 15,
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
        gap: 7,
    },
    timeWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeText: {
        color: COLORS.primaryDark,
        fontWeight: '700',
        fontSize: 18,
        lineHeight: 18,
        letterSpacing: 0.2,
    },

    // NEW / MODIFIED STYLES FOR ANIMATION
    expandWrapper: {
        overflow: 'hidden',
    },
    measureContainer: {
        width: '100%',
        position: 'absolute', // Taking it out of flow allows the wrapper to start at 0 height
        top: 0,
        left: 0,
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
        color: COLORS.primaryDark,
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
        color: COLORS.primaryDark,
        textAlign: 'center',
        opacity: 0.6,
    },
    noParticipants: {
        color: COLORS.primaryDark,
        opacity: 0.5,
    },
    actionButtons: {
        padding: 13,
        paddingBottom: 0,
        gap: 10,
        alignItems: 'flex-start', // Changed to align left
        justifyContent: 'flex-start',
        flex: 1,
        zIndex: 2,
    },
    mapsButtonContainer: {
        alignSelf: 'flex-start',
    },
    mapsButtonWrapper: {
        borderRadius: 15, // Smooth corners for wrapper too? If Expo BlurView supports it.
        overflow: 'hidden',
    },
    mapsButton: {
        backgroundColor: 'rgba(0, 68, 98, 0.4)',
        borderColor: 'transparent',
    },
    registerButtonContainer: {
        width: '100%',
        paddingHorizontal: 13,
        paddingBottom: 13,
        paddingTop: 10,
    },
    registerButtonWrapper: {
        borderRadius: 25,
        overflow: 'hidden',
        width: '100%',
    },
    registerButton: {
        width: '100%',
        backgroundColor: 'rgba(0, 149, 214, 0.4)',
        height: 56, // Slightly taller for "M'inscrire"
        borderRadius: 25,
    },
});

export default IntracomCard;
