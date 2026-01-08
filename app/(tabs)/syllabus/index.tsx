import { Papicons } from '@getpapillon/papicons';
import { LegendList } from '@legendapp/list';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAurigaRefresh } from '@/components/AurigaRefreshProvider';
import AurigaAPI from '@/services/auriga';
import { Syllabus } from '@/services/auriga/types';
import ChipButton from '@/ui/components/ChipButton';
import List from '@/ui/components/List';
import Stack from '@/ui/components/Stack';
import TabHeader from '@/ui/components/TabHeader';
import TabHeaderTitle from '@/ui/components/TabHeaderTitle';
import Typography from '@/ui/components/Typography';
import { getUeName } from '@/utils/ueParams';

import SyllabusItem from './components/SyllabusItem';
import { generateFullPdfHtml } from './utils/pdfGenerator';

const SyllabusView: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomTabBarHeight = useBottomTabBarHeight();

  const [headerHeight, setHeaderHeight] = useState(0);
  const [syllabusList, setSyllabusList] = useState<Syllabus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parcours, setParcours] = useState<'all' | 'PC' | 'PA'>('all');

  // Parcours options
  const parcoursOptions = [
    { label: 'Tous', value: 'all', icon: { ios: 'list.bullet', papicon: 'list' } },
    { label: 'Parcours Classique', value: 'PC', icon: { ios: 'person', papicon: 'user' } },
    { label: 'Parcours Accompagné', value: 'PA', icon: { ios: 'person.2', papicon: 'user' } },
  ];

  // Detect if any syllabus has PC/PA parcours codes
  // Only show the toggle if at least one syllabus has _PC_ or _PA_ pattern
  const hasParcours = useMemo(() => {
    return syllabusList.some(s =>
      s.name.includes('_PC_') || s.name.endsWith('_PC') ||
      s.name.includes('_PA_') || s.name.endsWith('_PA')
    );
  }, [syllabusList]);

  // Load syllabus data
  // Load syllabus data
  useFocusEffect(
    useCallback(() => {
      loadSyllabus();
    }, [])
  );

  const loadSyllabus = async () => {
    setLoading(true);
    try {
      const data = AurigaAPI.getAllSyllabus();
      setSyllabusList(data);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  const { refreshAuriga } = useAurigaRefresh();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Use global background refresh
    refreshAuriga();
    setIsRefreshing(false);
  };

  // Filter by parcours and group by semester
  const groupedSyllabus = useMemo(() => {
    // First filter by parcours
    // Parcours codes (PC/PA) appear as standalone segments with underscores: _PC_ or _PA_
    const filtered = syllabusList.filter((s) => {
      if (parcours === 'all') { return true; }

      // Check for parcours pattern with underscores to avoid false matches
      // e.g., "_PA_" should match but "AFP" (containing PA) should not
      const hasPC = s.name.includes('_PC_') || s.name.endsWith('_PC');
      const hasPA = s.name.includes('_PA_') || s.name.endsWith('_PA');

      if (parcours === 'PC') {
        // Show items with PC or items without any parcours (for S05+ which have no PC/PA)
        return hasPC || (!hasPC && !hasPA);
      }

      if (parcours === 'PA') {
        // Show items with PA or items without any parcours (for S05+ which have no PC/PA)
        return hasPA || (!hasPC && !hasPA);
      }

      return true;
    });

    // Then group by semester
    const groups: { [key: number]: Syllabus[] } = {};
    filtered.forEach((s) => {
      if (!groups[s.semester]) {
        groups[s.semester] = [];
      }
      groups[s.semester].push(s);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([semester, items]) => {
        // Group by UE
        const ueGroups: { [key: string]: Syllabus[] } = {};
        items.forEach((item) => {
          const ueName = item.UE || "Autre";
          if (!ueGroups[ueName]) {
            ueGroups[ueName] = [];
          }
          ueGroups[ueName].push(item);
        });

        const sortedUeGroups = Object.entries(ueGroups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, groupItems]) => ({
            name,
            items: groupItems.sort((a, b) => a.name.localeCompare(b.name)),
          }));

        return {
          semester: Number(semester),
          ueGroups: sortedUeGroups,
        };
      });
  }, [syllabusList, parcours]);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const html = generateFullPdfHtml(groupedSyllabus, parcours, colors);
      const { uri } = await Print.printToFileAsync({
        html,
        width: 595, // A4 width in points (72 dpi)
        height: 842, // A4 height in points (72 dpi)
        margins: { left: 0, right: 0, top: 0, bottom: 0 } // Critical: Remove default OS margins
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Syllabus complet'
        });
      }
    } catch {
      // fail silently
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const renderSemesterSection = ({ item }: { item: { semester: number; ueGroups: { name: string; items: Syllabus[] }[] } }) => (
    <Stack style={{ marginBottom: 16 }}>
      <Typography variant="h6" color="secondary" style={{ marginBottom: 8, marginLeft: 4 }}>
        Semestre {item.semester}
      </Typography>
      {item.ueGroups.map((group) => (
        <List key={group.name} style={{ marginBottom: 12 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
            <Typography variant="body2" color="tertiary" style={{ fontSize: 13, textTransform: 'uppercase' }}>
              {getUeName(group.name)}
            </Typography>
          </View>
          {group.items.map((syllabus) => (
            <SyllabusItem key={syllabus.id} syllabus={syllabus} />
          ))}
        </List>
      ))}
    </Stack>
  );

  return (
    <View style={{ flex: 1 }}>
      <TabHeader
        onHeightChanged={setHeaderHeight}
        title={
          <TabHeaderTitle
            leading={t("Tab_Syllabus")}
            chevron={false}
          />
        }
        trailing={
          // Only show parcours filter if at least one syllabus has PC/PA
          hasParcours ? (
            <ChipButton
              onPressAction={({ nativeEvent }) => {
                const actionId = nativeEvent.event;
                if (actionId.startsWith("parcours:")) {
                  const value = actionId.replace("parcours:", "") as 'all' | 'PC' | 'PA';
                  setParcours(value);
                }
              }}
              actions={
                parcoursOptions.map((p) => ({
                  id: "parcours:" + p.value,
                  title: p.label,
                  state: parcours === p.value ? "on" : "off",
                  image: Platform.select({
                    ios: p.icon.ios,
                  }),
                  imageColor: colors.text,
                }))
              }
              icon={parcoursOptions.find(p => p.value === parcours)?.icon.papicon || 'filter'}
              chevron
            >
              {parcoursOptions.find(p => p.value === parcours)?.label || 'Tous'}
            </ChipButton>
          ) : undefined
        }
      />

      <LegendList
        data={groupedSyllabus}
        renderItem={renderSemesterSection}
        keyExtractor={(item) => `semester - ${item.semester} `}
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: bottomTabBarHeight + insets.bottom + 16,
          paddingHorizontal: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            progressViewOffset={headerHeight + insets.top}
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <Stack hAlign="center" vAlign="center" padding={[32, 16]}>
              <Typography variant="body1" color="secondary">
                {t("Syllabus_Empty")}
              </Typography>
            </Stack>
          )
        }
        ListFooterComponent={
          !loading && syllabusList.length > 0 ? (
            <View style={{ paddingBottom: bottomTabBarHeight + insets.bottom + 16, paddingTop: 16 }}>
              <TouchableOpacity
                onPress={handleDownloadPdf}
                disabled={isGeneratingPdf}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                  marginHorizontal: 16,
                  padding: 16,
                  borderRadius: 12,
                  opacity: isGeneratingPdf ? 0.7 : 1,
                  shadowColor: "#000",
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.1,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}
              >
                {isGeneratingPdf ?
                  <ActivityIndicator color="white" style={{ marginRight: 8 }} /> :
                  <Papicons name="Download" size={20} color="white" style={{ marginRight: 8 }} />
                }
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                  {isGeneratingPdf ? 'Génération...' : 'Télécharger le syllabus complet (PDF)'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
};

export default SyllabusView;
