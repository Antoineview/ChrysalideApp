import { Papicons } from '@getpapillon/papicons';
import { useTheme } from '@react-navigation/native';
import { LiquidGlassView } from '@sbaiahmed1/react-native-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { Alert, InteractionManager, Linking, Pressable, StyleSheet, View } from 'react-native';
import Collapsible from 'react-native-collapsible';
import MapView, { Marker } from 'react-native-maps';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { getIntracomToken } from '@/app/(modals)/login-intracom';
import Typography from '@/ui/components/Typography';
import { getProfileColorByName } from '@/utils/chats/colors';
import { fetchIntracomProfile, getIntracomProfile, registerForEvent } from '@/utils/intracom';

// Types
interface IntracomEvent {
    id: number;
    title?: string;
    date: string | number;
    type: string | number; // Allow number
    typeName?: string; // Add typeName for API values
    name: string;
    campusSlug?: string;
    registeredStudents?: number;
    nbNewStudents?: number;
    maxStudents?: number;
    state?: "OPEN" | "CLOSED";
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

interface IntracomSlotInfo {
    date: string;
    jobs: IntracomJob[];
}

interface IntracomJob {
    id: number;
    name: string;
    slots: IntracomSlot[];
}

interface IntracomSlot {
    id: number;
    startTime: string;
    endTime: string;
    groups: IntracomSlotGroup[];
}

interface IntracomSlotGroup {
    id: number;
    nbStudent: number;
    groupSlug: string;
    participants: IntracomParticipant[];
}

interface IntracomParticipant {
    id: number;
    login: string;
    isNew: boolean;
}

interface IntracomCardProps {
    event: IntracomEvent;
    readOnly?: boolean;
    hideRegisterButton?: boolean;
}

const AnimatedView = Reanimated.createAnimatedComponent(View);

// Design specific colors
const INTRACOM_PALETTE = {
    "Forum": { primary: "#0194D5", light: "#0194D5" },
    "Conférence": { primary: "#8E44AD", light: "#9B59B6" },
    "JPO": { primary: "#E67E22", light: "#F39C12" },
    "Hackhaton": { primary: "#27AE60", light: "#2ECC71" },
    "Ancien": { primary: "#C0392B", light: "#E74C3C" },
    "Divers": { primary: "#7F8C8D", light: "#95A5A6" },
    "Soirée": { primary: "#2C3E50", light: "#34495E" },
    "Concours": { primary: "#D35400", light: "#E67E22" },
    "IMMERSIVE_DAY": { primary: "#00B894", light: "#55EFC4" },
    "SALON": { primary: "#D63031", light: "#FF7675" },
    default: { primary: "#0194D5", light: "#0194D5" }
};

const getEventColors = (type?: string | number, typeName?: string) => {
    // 1. Try typeName (API often returns this string, e.g. "JPO", "SALON")
    if (typeName) {
        const key = Object.keys(INTRACOM_PALETTE).find(k => typeName.includes(k)) as keyof typeof INTRACOM_PALETTE;
        return INTRACOM_PALETTE[key] || INTRACOM_PALETTE.default;
    }

    // 2. Try type if it's a string (Legacy/Scraped)
    if (typeof type === 'string') {
        const key = Object.keys(INTRACOM_PALETTE).find(k => type.includes(k)) as keyof typeof INTRACOM_PALETTE;
        return INTRACOM_PALETTE[key] || INTRACOM_PALETTE.default;
    }

    // 3. Fallback (numeric types or unknown)
    return INTRACOM_PALETTE.default;
};

const IntracomCard: React.FC<IntracomCardProps> = ({ event, readOnly = false, hideRegisterButton = false }) => {
    // Theme hook not effectively used for design colors but kept for potential needs
    // const { dark } = useTheme();

    // We force the design colors regardless of theme for the card internal look, 
    // as it follows a specific brand design (blue card).
    // But we might want to respect some dark mode aspects if needed.
    // However, the Figma design provided is very specific about colors.

    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [participants, setParticipants] = useState<IntracomParticipant[]>(() => {
        if (event.participants) {
            try { return JSON.parse(event.participants); } catch { }
        }
        return [];
    });
    const [slotTimes, setSlotTimes] = useState<{ start: string; end: string } | null>(() => {
        if (event.slotTimes) {
            try { return JSON.parse(event.slotTimes); } catch { }
        }
        return null;
    });

    const [isRegistered, setIsRegistered] = useState(false);
    const [registering, setRegistering] = useState(false);

    // Check if user is registered
    React.useEffect(() => {
        const checkRegistration = async () => {
            const profile = await getIntracomProfile();
            if (profile && participants.some(p => p.login === profile.login)) {
                setIsRegistered(true);
            } else {
                setIsRegistered(false);
            }
        };
        checkRegistration();
    }, [participants]);

    const handleRegister = async () => {
        const token = getIntracomToken();
        if (!token) {
            Alert.alert("Erreur", "Vous n'êtes pas connecté à Intracom.");
            return;
        }

        setRegistering(true);
        try {
            // 1. Ensure we have a profile (fetch latest if possible, or fallback to DB)
            let profile = await fetchIntracomProfile(token);
            if (!profile) {
                // strict fallback
                profile = await getIntracomProfile();
            }

            if (!profile) {
                Alert.alert("Erreur", "Impossible de récupérer votre profil Intracom.");
                return;
            }

            // 2. Register
            const result = await registerForEvent(event.id, token, profile, event);

            if (result.success) {
                Alert.alert("Succès", "Inscription résussie !");
                setIsRegistered(true);
                // Optionally refresh slots to show yourself in the list immediately (UI optimistically updated above?)
                // Actually matching logic might want a refresh:
                fetchSlotInfo();
            } else {
                Alert.alert("Erreur", result.message || "L'inscription a échoué.");
            }
        } catch (error) {
            Alert.alert("Erreur", "Une erreur inattendue est survenue.");
            console.error(error);
        } finally {
            setRegistering(false);
        }
    };



    // Sync state with props if they update (e.g. background fetch completion)
    React.useEffect(() => {
        if (event.participants) {
            try { setParticipants(JSON.parse(event.participants)); } catch { }
        }
        if (event.slotTimes) {
            try { setSlotTimes(JSON.parse(event.slotTimes)); } catch { }
        }
    }, [event.participants, event.slotTimes]);

    const theme = useTheme();
    const { dark } = theme;

    // Derived colors
    const colors = getEventColors(event.type, event.typeName);

    // Dynamic Styles
    const pillBg = dark ? '#262626' : 'white';
    const contentColor = dark ? 'white' : colors.primary;
    const nameColor = dark ? 'white' : 'black';

    // Animation values
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Format date as DD/MM/YY
    const formatDate = (dateValue: string | number) => {
        try {
            const date = new Date(dateValue);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear().toString().slice(-2);
            return `${day}/${month}/${year}`;
        } catch {
            return String(dateValue);
        }
    };

    // Get event type label
    const getTypeLabel = (type: string | number) => {
        let key = type;
        if (typeof key !== 'string') {
            key = event.typeName || 'Autre';
        }

        const types: Record<string, string> = {
            FORUM_CPGE: "Forum CPGE",
            FORUM_HIGHSCHOOL: "Forum Lycée",
            FORUM_BAC: "Forum BAC",
            SALON: "Salon",
            JPO: "JPO",
            IMMERSIVE_DAY: "JI",
            PRESENTIEL: "Présentiel",
            DISTANCIEL: "Distanciel",
        };
        return types[key as string] || key;
    };

    // Parse event name to extract place name and city
    const parseEventName = (name: string, knownCity?: string) => {
        let cleanName = name
            .replace(/\s*-?\s*Présentiel\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*Forum CPGE\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*Forum Lycée\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*Forum BAC\+?\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*FORUM LYCEE\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*FORUM CPGE\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*FORUM BAC\+?\s*-?\s*/gi, ' ')
            // Remove dates in format DD/MM/YYYY or DD/MM/YY
            .replace(/\s*-?\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*-?\s*/g, ' ')
            // Remove verbose dates "du 19 octobre 2024" or "du 19 octobre"
            .replace(/\s*du\s+\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)(?:\s+\d{4})?/gi, ' ')
            // If contains "Lycée" or "Lycee", keep only from it onwards
            .replace(/^.*?(?=Lyc[eé]e)/i, '')
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/^-\s*/, '')
            .replace(/\s*-$/, '');

        // If we know the city, try to strip it from the name to clean it up
        if (knownCity) {
            // Check if name ends with city
            const cityRegexEnd = new RegExp(`\\s*-\\s*${knownCity}\\s*$`, 'i');
            if (cityRegexEnd.test(cleanName)) {
                cleanName = cleanName.replace(cityRegexEnd, '');
                return { city: knownCity, placeName: cleanName };
            }

            // Check if name starts with city
            const cityRegexStart = new RegExp(`^${knownCity}\\s*-\\s*`, 'i');
            if (cityRegexStart.test(cleanName)) {
                cleanName = cleanName.replace(cityRegexStart, '');
                return { city: knownCity, placeName: cleanName };
            }
        }

        if (cleanName.includes(" - ")) {
            const parts = cleanName.split(" - ").filter(p => p.trim() !== '');
            if (parts.length >= 2) {
                // Heuristic: usually "City - Place" or "Place - City". 
                // Without knownCity, it's hard to be 100% sure.
                // But existing logic assumed City - Place.
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

    const { placeName, city: parsedCity } = parseEventName(event.name, event.town);
    const city = event.town || parsedCity;

    // Format time from date string
    const formatTime = (dateValue: string | number) => {
        try {
            const date = new Date(dateValue);
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'h');
        } catch {
            return '--h--';
        }
    };

    // End time fallback (2h after start)
    const getEndTime = (dateValue: string | number) => {
        try {
            const date = new Date(dateValue);
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

    // Fetch slot info when expanded
    const fetchSlotInfo = useCallback(async () => {
        const token = getIntracomToken();
        if (!token) {
            return;
        }

        setLoading(true);
        try {
            const slotsRes = await fetch(`https://intracom.epita.fr/api/Events/${event.id}/SlotInfos`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

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

    // Fetch on mount (only if missing)
    React.useEffect(() => {
        if (participants.length === 0 && !slotTimes) {
            fetchSlotInfo();
        }
    }, [fetchSlotInfo, participants.length, slotTimes]);

    const handlePress = () => {
        if (readOnly) { return; } // Disable interaction in read-only mode

        if (!expanded) {
            InteractionManager.runAfterInteractions(() => {
                fetchSlotInfo();
            });
        }
        setExpanded(!expanded);
        scale.value = withSpring(0.97, { duration: 50 });
        setTimeout(() => {
            scale.value = withSpring(1, { duration: 200 });
        }, 50);
    };

    const openInMaps = () => {
        if (event.latitude && event.longitude) {
            const address = event.address ? `${event.address}, ${event.town}` : event.name;
            const url = `https://maps.apple.com/?ll=${event.latitude},${event.longitude}&q=${encodeURIComponent(address)}`;
            Linking.openURL(url);
        }
    };

    const displayStartTime = slotTimes ? formatTime(slotTimes.start) : formatTime(event.date);
    const displayEndTime = slotTimes ? formatTime(slotTimes.end) : getEndTime(event.date);



    return (
        <Pressable onPress={handlePress} disabled={readOnly}>
            <AnimatedView style={[styles.cardContainer, animatedStyle, { backgroundColor: colors.primary }, expanded && { height: 444 }]}>
                {expanded && event.latitude && event.longitude && (
                    <View style={[StyleSheet.absoluteFill, { borderRadius: 25, overflow: 'hidden', borderCurve: 'continuous' }]}>
                        <MapView
                            style={StyleSheet.absoluteFill}
                            initialRegion={{
                                latitude: event.latitude + 0.002, // Shift center North to push pin South
                                longitude: event.longitude,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }}
                            scrollEnabled={false}
                            zoomEnabled={false}
                            pitchEnabled={false}
                            rotateEnabled={false}
                            pointerEvents="none" // Ensure touches pass through if needed, though usually just disabling controls is enough
                        >
                            <Marker
                                coordinate={{ latitude: event.latitude, longitude: event.longitude }}
                            />
                        </MapView>
                    </View>
                )}

                <LinearGradient
                    colors={expanded ? [colors.primary, 'rgba(255, 255, 255, 0.01)'] : [colors.primary, colors.primary]}
                    locations={expanded ? [0.27, 0.60] : [0, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.contentContainer}>
                    {/* Top Section */}
                    <View style={styles.topSection}>
                        {/* Left Info Column */}
                        <View style={styles.leftInfoColumn}>
                            {/* Header: Badge & Date */}
                            <View style={styles.headerRow}>
                                <View style={[styles.typeBadge, { backgroundColor: pillBg }]}>
                                    <Typography variant="body2" style={[styles.badgeText, { color: contentColor }]}>
                                        {getTypeLabel(event.type)}
                                    </Typography>
                                </View>
                                <View style={styles.dateRow}>
                                    <Papicons name="Calendar" size={18} color="white" />
                                    <Typography variant="body2" style={styles.dateText}>
                                        {formatDate(event.date)}
                                    </Typography>
                                </View>
                            </View>

                            {/* Title */}
                            <Typography variant="h5" style={styles.title} numberOfLines={readOnly ? 0 : 1}>
                                {placeName || event.name}
                            </Typography>

                            {/* Location */}
                            {city && !readOnly && (
                                <View style={styles.locationRow}>
                                    <Papicons name="MapPin" size={18} color="white" />
                                    <Typography variant="body2" style={styles.locationText}>
                                        {city}
                                    </Typography>
                                </View>
                            )}
                        </View>

                        {/* Vertical Separator */}
                        <View style={styles.separator} />

                        {/* Right Time Column */}
                        <View style={styles.rightTimeColumn}>
                            {event.bonus !== undefined && event.bonus > 0 ? (
                                <View style={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <Typography variant="h3" style={[styles.timeText, { fontSize: 24, lineHeight: 28 }]}>+{event.bonus}</Typography>
                                    <Typography variant="caption" style={{ color: 'white', fontWeight: 'bold' }}>PTS</Typography>
                                </View>
                            ) : (
                                <>
                                    <Typography variant="h5" style={styles.timeText}>{displayStartTime}</Typography>
                                    <View style={{ transform: [{ rotate: '-90deg' }] }}>
                                        <Papicons name="ArrowLeft" size={16} color="white" />
                                    </View>
                                    <Typography variant="h5" style={styles.timeText}>{displayEndTime}</Typography>
                                </>
                            )}
                        </View>
                    </View>

                    {/* Expanded Content */}
                    <Collapsible collapsed={!expanded}>
                        <View style={styles.expandedContent}>
                            {/* Inscrits Section */}
                            <View style={[styles.inscritsContainer, { backgroundColor: pillBg }]}>
                                <View style={styles.inscritsHeader}>
                                    <Papicons name="user" size={14} color={contentColor} />
                                    <Typography variant="caption" style={[styles.inscritsTitle, { color: contentColor }]}>
                                        Inscrits
                                    </Typography>
                                </View>

                                <View style={styles.participantsList}>
                                    {loading ? (
                                        <Typography variant="caption" style={{ color: 'black', opacity: 0.5 }}>Chargement...</Typography>
                                    ) : participants.length > 0 ? (
                                        participants.slice(0, 5).map((participant) => (
                                            <View key={participant.id} style={styles.participantItem}>
                                                <View style={[styles.avatar, { borderColor: getProfileColorByName(participant.login), backgroundColor: pillBg }]}>
                                                    <Typography style={{ color: getProfileColorByName(participant.login), fontSize: 19, fontWeight: '500' }}>
                                                        {getFirstName(participant.login).charAt(0)}
                                                    </Typography>
                                                </View>
                                                <Typography variant="caption" style={{ fontSize: 12, color: nameColor }}>{getFirstName(participant.login)}</Typography>
                                            </View>
                                        ))
                                    ) : (
                                        <View style={{ flex: 1, justifyContent: 'center' }}>
                                            <Typography variant="caption" style={{ color: 'black', opacity: 0.5 }}>Aucun inscrit</Typography>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.actionButtonsContainer}>
                                <Pressable onPress={openInMaps} style={styles.mapButtonWrapper}>
                                    <LiquidGlassView
                                        glassType="regular"
                                        glassTintColor="transparent"
                                        glassOpacity={0}
                                        isInteractive={true}
                                        style={styles.mapButton}
                                    >
                                        <View style={styles.mapIconContainer}>
                                            <Papicons name="MapPin" size={12} color={contentColor} />
                                        </View>
                                        <Typography variant="caption" style={[styles.mapButtonText, { color: contentColor }]}>Ouvrir dans maps</Typography>
                                    </LiquidGlassView>
                                </Pressable>
                            </View>
                        </View>
                    </Collapsible>
                </View>

                {/* Register Button (Absolute Bottom) */}
                {expanded && !hideRegisterButton && (
                    <View style={styles.absoluteRegisterButtonContainer}>
                        <Pressable style={styles.registerButtonWrapper} onPress={handleRegister} disabled={isRegistered || registering}>
                            <LiquidGlassView
                                glassType="regular"
                                glassTintColor="transparent"
                                glassOpacity={0}
                                isInteractive={true}
                                style={[styles.registerButton, isRegistered && { backgroundColor: '#4CAF50' }]} // Green if registered? Or just disable
                            >
                                <Papicons name={isRegistered ? "check" : "add"} size={18} color={contentColor} />
                                <Typography variant="h5" style={[styles.registerButtonText, { color: contentColor }]}>
                                    {registering ? "Inscription..." : isRegistered ? "Déjà inscrit" : "M'inscrire !"}
                                </Typography>
                            </LiquidGlassView>
                        </Pressable>
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
        // backgroundColor handled dynamically
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 3.3,
        elevation: 3,
        marginBottom: 10,
    },
    contentContainer: {
        padding: 13,
        flex: 1,
    },
    topSection: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 14,
    },
    leftInfoColumn: {
        flex: 1,
        gap: 7,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    typeBadge: {
        backgroundColor: 'white',
        borderRadius: 15,
        borderCurve: 'continuous',
        paddingHorizontal: 10,
        paddingVertical: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontWeight: '700',
        fontSize: 15,
        lineHeight: 15,
        letterSpacing: 0.15,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dateText: {
        color: 'white',
        fontWeight: '500',
        fontSize: 15,
        lineHeight: 15,
    },
    title: {
        color: 'white',
        fontWeight: '700',
        fontSize: 18,
        lineHeight: 22,
        letterSpacing: 0.18,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    locationText: {
        color: 'white',
        fontWeight: '500',
        fontSize: 15,
        lineHeight: 15,
    },
    separator: {
        width: 2,
        backgroundColor: 'white',
        opacity: 0.5,
        borderRadius: 2,
    },
    rightTimeColumn: {
        width: 65,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
    },
    timeText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 18,
        lineHeight: 18,
        letterSpacing: 0.18,
    },
    expandedContent: {
        marginTop: 20,
        gap: 13,
        flex: 1,
        justifyContent: 'space-between',
    },
    inscritsContainer: {
        backgroundColor: 'white',
        borderRadius: 19,
        borderCurve: 'continuous',
        padding: 10,
        gap: 13,
    },
    inscritsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    inscritsTitle: {
        fontWeight: '700',
        fontSize: 14,
        letterSpacing: 0.14,
    },
    participantsList: {
        flexDirection: 'row',
        gap: 7,
        paddingLeft: 4,
        height: 52, // Fixed height to match populated state (35px avatar + 4px gap + 13px text approx)
        alignItems: 'center',
    },
    participantItem: {
        alignItems: 'center',
        gap: 4,
    },
    avatar: {
        width: 35,
        height: 35,
        borderRadius: 28,
        backgroundColor: 'white',
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    actionButtonsContainer: {
        paddingTop: 9,
        gap: 13,
        alignItems: 'center',
    },
    mapButtonWrapper: {
        borderRadius: 15,
        borderCurve: 'continuous',
        overflow: 'hidden',
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    mapIconContainer: {
        width: 15,
        height: 15,
        borderRadius: 7.5,
        backgroundColor: 'rgba(255,255,255,0.2)', // Semi-transparent bg for icon if needed, or just standard view
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapButtonText: {
        color: 'white',
        fontWeight: '500',
        fontSize: 12,
    },
    absoluteRegisterButtonContainer: {
        position: 'absolute',
        bottom: 13,
        left: 13,
        right: 13,
        zIndex: 10,
    },
    registerButtonWrapper: {
        width: '100%',
    },
    registerButton: {
        borderRadius: 25,
        borderCurve: 'continuous',
        overflow: 'hidden',
        paddingVertical: 12,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 11,
        width: '100%',
    },
    registerButtonText: {
        color: 'white',
        fontWeight: '500',
        fontSize: 19,
    },
});

export default IntracomCard;
