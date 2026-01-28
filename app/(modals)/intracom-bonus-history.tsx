import { Papicons } from '@getpapillon/papicons';
import { MenuView, NativeActionEvent } from '@react-native-menu/menu';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Platform } from 'react-native';

import { getDatabaseInstance } from '@/database/DatabaseProvider';
import IntracomBonus from '@/database/models/IntracomBonus';
import { Dynamic } from '@/ui/components/Dynamic';
import Icon from '@/ui/components/Icon';
import { NativeHeaderHighlight, NativeHeaderPressable, NativeHeaderSide, NativeHeaderTitle } from '@/ui/components/NativeHeader';
import Stack from '@/ui/components/Stack';
import Typography from '@/ui/components/Typography';
import { PapillonAppearIn, PapillonAppearOut } from '@/ui/utils/Transition';

import IntracomCard from '../(tabs)/news/components/IntracomCard';

const IntracomBonusHistoryModal = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const [history, setHistory] = useState<any[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const db = getDatabaseInstance();
            const bonuses = await db.get<IntracomBonus>("intracom_bonus").query().fetch();
            if (bonuses.length > 0 && bonuses[0].history) {
                const parsed = JSON.parse(bonuses[0].history);
                // Check if new structure (array of semesters) or legacy (array of events)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    if (parsed[0].events && Array.isArray(parsed[0].events)) {
                        // New structure
                        setHistory(parsed);
                        // Default to last semester (latest)
                        setSelectedSemester(parsed.length - 1);
                    } else {
                        // Legacy structure (flat events)
                        // Wrap in a dummy semester
                        setHistory([{ events: parsed }]);
                        setSelectedSemester(0);
                    }
                }
            }
        } catch (e) {
            console.warn("Failed to load bonus history", e);
        } finally {
            setLoading(false);
        }
    };

    const currentEvents = history[selectedSemester]?.events || [];

    return (
        <Stack flex style={{ backgroundColor: colors.background, flex: 1, width: '100%' }}>
            <FlatList
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={{ paddingTop: 100, paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
                data={currentEvents}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={({ item }) => (
                    <IntracomCard event={item} readOnly={true} />
                )}
                ListEmptyComponent={
                    !loading ? (
                        <Dynamic animated key={'empty-list:bonus'} entering={PapillonAppearIn} exiting={PapillonAppearOut}>
                            <Stack hAlign="center" vAlign="center" flex style={{ marginTop: 40, gap: 10 }}>
                                <Icon opacity={0.5} size={32}>
                                    <Papicons name="Star" />
                                </Icon>
                                <Typography variant="body1" color="secondary" align="center">
                                    Aucun historique de points bonus trouvé.
                                </Typography>
                            </Stack>
                        </Dynamic>
                    ) : null
                }
            />

            <NativeHeaderSide side="Right">
                <NativeHeaderPressable onPress={() => router.back()}>
                    <Icon papicon opacity={0.5}>
                        <Papicons name="Cross" />
                    </Icon>
                </NativeHeaderPressable>
            </NativeHeaderSide>

            <NativeHeaderTitle key={`history-sem-${selectedSemester}`}>
                <MenuView
                    onPressAction={(e: NativeActionEvent) => {
                        const index = parseInt(e.nativeEvent.event, 10);
                        if (!isNaN(index)) {
                            setSelectedSemester(index);
                        }
                    }}
                    actions={history.map((h, index) => {
                        const start = new Date(h.startTime);
                        const end = new Date(h.endTime);
                        return {
                            id: index.toString(),
                            title: `Semestre ${index + 1}`,
                            subtitle: `${start.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })} - ${end.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}`,
                            state: selectedSemester === index ? 'on' : 'off',
                            image: Platform.select({
                                ios: (index + 1) + ".calendar"
                            }),
                        };
                    })}
                >
                    <Dynamic
                        animated={true}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            width: 200,
                            height: 60,
                        }}
                    >
                        <Dynamic animated>
                            <Typography inline variant="navigation">Semestre</Typography>
                        </Dynamic>
                        <Dynamic animated>
                            <NativeHeaderHighlight>{(selectedSemester + 1).toString()}</NativeHeaderHighlight>
                        </Dynamic>
                        <Dynamic animated>
                            <Icon papicon size={16} opacity={0.6}>
                                <Papicons name="ChevronDown" strokeWidth={2.5} />
                            </Icon>
                        </Dynamic>
                    </Dynamic>
                </MenuView>
            </NativeHeaderTitle>
        </Stack>
    );
};

export default IntracomBonusHistoryModal;
