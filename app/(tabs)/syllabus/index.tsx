import { Papicons } from '@getpapillon/papicons';
import { LegendList } from '@legendapp/list';
import { MenuView } from '@react-native-menu/menu';
import { useFocusEffect, useTheme } from '@react-navigation/native';
// Legacy import for SDK 54 compatibility
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, RefreshControl, View } from 'react-native';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAurigaRefresh } from '@/components/AurigaRefreshProvider';
import AurigaAPI from '@/services/auriga';
import { Syllabus } from '@/services/auriga/types';
import Button from '@/ui/components/Button';
import ChipButton from '@/ui/components/ChipButton';
import Search from '@/ui/components/Search';
import Stack from '@/ui/components/Stack';
import TabHeader from '@/ui/components/TabHeader';
import TabHeaderTitle from '@/ui/components/TabHeaderTitle';
import Typography from '@/ui/components/Typography';
import { getUeName } from '@/utils/ueParams';

import SyllabusItem from './components/SyllabusItem';
import UEGroup from './components/UEGroup';
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
  const [searchText, setSearchText] = useState<string>('');

  // Semesters
  const availableSemesters = useMemo(() => {
    const semesters = new Set(syllabusList.map((s) => s.semester));
    return Array.from(semesters).sort((a, b) => a - b);
  }, [syllabusList]);

  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);

  React.useEffect(() => {
    if (availableSemesters.length > 0 && selectedSemester === null) {
      setSelectedSemester(availableSemesters[0]);
    }
  }, [availableSemesters, selectedSemester]);

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

  // Filter by parcours and search text, then group by semester/UE
  const groupedSyllabus = useMemo(() => {
    const filtered = syllabusList.filter((s) => {
      // Check for parcours pattern
      const hasPC = s.name.includes('_PC_') || s.name.endsWith('_PC');
      const hasPA = s.name.includes('_PA_') || s.name.endsWith('_PA');

      // Parcours filter
      if (parcours === 'PC' && !(hasPC || (!hasPC && !hasPA))) {
        return false;
      }
      if (parcours === 'PA' && !(hasPA || (!hasPC && !hasPA))) {
        return false;
      }

      // (Removed strictly filtering by semester to allow scrolling freely)
      /* if (selectedSemester !== null && s.semester !== selectedSemester) {
        return false;
      } */

      // Search filter
      if (searchText.trim() !== '') {
        const lowerSearch = searchText.toLowerCase();
        const subjectName = (s.caption?.name || s.name).toLowerCase();
        const ueName = (s.UE || '').toLowerCase();
        return subjectName.includes(lowerSearch) || ueName.includes(lowerSearch);
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
  }, [syllabusList, parcours, searchText]);

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

      const currentYear = new Date().getFullYear();
      const startYear = new Date().getMonth() < 8 ? currentYear - 1 : currentYear;
      const yearStr = `${startYear}-${startYear + 1}`;

      const semesters = groupedSyllabus.map(s => s.semester).sort((a, b) => a - b);
      const semStr = semesters.length > 0
        ? (semesters.length > 1 ? `S${semesters[0]}-S${semesters[semesters.length - 1]}` : `S${semesters[0]}`)
        : "Syllabus";

      const fileName = `Syllabus ${yearStr} - ${semStr} - généré par Chrysalide.pdf`;
      // Cast FileSystem to any to avoid type errors with cacheDirectory
      const newPath = `${(FileSystem as any).cacheDirectory}${fileName}`;

      await FileSystem.moveAsync({
        from: uri,
        to: newPath
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newPath, {
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf',
          dialogTitle: fileName
        });
      }
    } catch {
      // fail silently
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const renderSemesterSection = ({ item, index }: { item: { semester: number; ueGroups: { name: string; items: Syllabus[] }[] }, index: number }) => (
    <Stack style={{ marginBottom: 16 }} gap={12}>
      {index > 0 && (
        <View style={{ overflow: 'hidden', height: 20, opacity: 0.3, marginTop: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Typography variant="caption" color="secondary" numberOfLines={1} style={{ textTransform: 'uppercase', fontSize: 12, width: '200%' }}>
            {(t('Syllabus_Next_Semester') + "   ").repeat(20)}
          </Typography>
        </View>
      )}
      {item.ueGroups.map((group) => (
        <UEGroup key={group.name} name={getUeName(group.name)}>
          {group.items.map((syllabus) => (
            <SyllabusItem key={syllabus.id} syllabus={syllabus} />
          ))}
        </UEGroup>
      ))}
    </Stack>
  );


  /* Scrollspy & Navigation */
  const listRef = React.useRef<any>(null);

  const handleScrollToIndex = (index: number) => {
    listRef.current?.scrollToIndex({
      index,
      animated: true,
      viewOffset: headerHeight, // offset for header
    });
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems && viewableItems.length > 0) {
      // Find the first visible item that is a semester section
      // Since data is groupedSyllabus, items ARE semesters.
      const firstItem = viewableItems[0];
      if (firstItem && firstItem.item && typeof firstItem.item.semester === 'number') {
        setSelectedSemester(firstItem.item.semester);
      }
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 10, // Updates as soon as 10% of new section is visible (or use 50 for center)
  }).current;

  return (
    <View style={{ flex: 1 }}>
      <TabHeader
        onHeightChanged={setHeaderHeight}
        title={
          <MenuView
            onPressAction={({ nativeEvent }) => {
              const actionId = nativeEvent.event;
              if (actionId.startsWith("semester:")) {
                const semester = parseInt(actionId.replace("semester:", ""), 10);
                setSelectedSemester(semester);
                // Scroll to this semester
                const index = groupedSyllabus.findIndex(s => s.semester === semester);
                if (index !== -1) {
                  handleScrollToIndex(index);
                }
              }
            }}
            actions={
              availableSemesters.map((sem) => ({
                id: "semester:" + sem,
                title: t("Grades_Semester") + " " + sem,
                state: selectedSemester === sem ? "on" : "off",
                image: Platform.select({
                  ios: sem + ".circle"
                }),
              }))
            }
          >
            <TabHeaderTitle
              leading={t("Grades_Semester")}
              number={selectedSemester?.toString()}
              color={colors.primary}
              chevron={availableSemesters.length > 1}
            />
          </MenuView>
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
        bottom={
          <Search
            placeholder={t('Syllabus_Search_Placeholder')}
            color={colors.primary}
            onTextChange={(text) => setSearchText(text)}
          />
        }
      />

      <LegendList
        ref={listRef}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
            <View style={{ paddingTop: 16 }}>
              <Button
                onPress={handleDownloadPdf}
                disabled={isGeneratingPdf}
                loading={isGeneratingPdf}
                icon={<Papicons name="Paper" size={20} />}
                title={isGeneratingPdf ? 'Génération...' : 'Télécharger le syllabus complet (PDF)'}
              />
            </View>
          ) : null
        }
      />
    </View>
  );
};

export default SyllabusView;
