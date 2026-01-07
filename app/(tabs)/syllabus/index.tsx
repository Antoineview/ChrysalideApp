import { Papicons } from '@getpapillon/papicons';
import { LegendList } from '@legendapp/list';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
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
import Item, { Leading, Trailing } from '@/ui/components/Item';
import List from '@/ui/components/List';
import Stack from '@/ui/components/Stack';
import TabHeader from '@/ui/components/TabHeader';
import TabHeaderTitle from '@/ui/components/TabHeaderTitle';
import Typography from '@/ui/components/Typography';
import adjust from '@/utils/adjustColor';
import { getSubjectColor } from '@/utils/subjects/colors';
import { getSubjectEmoji } from '@/utils/subjects/emoji';
import { getSubjectName } from '@/utils/subjects/name';

function cleanHtml(raw?: string | null): string {
  if (!raw) { return ""; }
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
}

const SyllabusView: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = useTheme();
  const router = useRouter();
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
    { label: 'Parcours Accompagné', value: 'PA', icon: { ios: 'person.2', papicon: 'users' } },
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
    } catch (e) {
      console.error("Failed to load syllabus:", e);
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

  const generateFullPdfHtml = (semesters: typeof groupedSyllabus) => {
    const title = "Syllabus";
    const dateGenerated = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Minimal styling matching the clean look of the app + EPITA blue
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: sans-serif; color: #333; line-height: 1.5; }
          h1, h2, h3, h4 { color: #102b65; margin-bottom: 0.5em; }
          h1 { border-bottom: 2px solid #102b65; padding-bottom: 10px; margin-bottom: 20px; }
          h2 { background: #f0f4f8; padding: 10px; border-left: 5px solid #102b65; margin-top: 30px; }
          h3 { margin-top: 20px; font-size: 1.2em; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .ue-group { margin-bottom: 20px; }
          .syllabus-item { margin-bottom: 25px; padding-left: 10px; border-left: 2px solid #ddd; }
          .item-meta { font-size: 0.9em; color: #666; margin-bottom: 5px; }
          .item-desc { margin-top: 5px; white-space: pre-wrap; font-size: 0.95em; }
          .table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9em; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .table th { background: #f9f9f9; width: 30%; }
          .footer { margin-top: 50px; font-size: 0.8em; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>EPITA - Syllabus</h1>
        <p>Généré le ${dateGenerated} • Filtre: ${parcours === 'all' ? 'Tous' : (parcours === 'PC' ? 'Parcours Classique' : 'Parcours Accompagné')}</p>

        ${semesters.map(sem => `
          <div class="semester-section">
            <h2>Semestre ${sem.semester}</h2>
            ${sem.ueGroups.map(group => `
              <div class="ue-group">
                <h3>${group.name}</h3>
                ${group.items.map(item => `
                  <div class="syllabus-item">
                    <h4>${cleanHtml(item.caption?.name || item.name)}</h4>
                    <div class="item-meta">
                       UE: ${item.UE} • Code: ${item.code} 
                       ${item.duration ? `• Durée: ${Math.round(item.duration / 3600)}h` : ''}
                       ${item.grade !== undefined ? `• Note: ${typeof item.grade === 'number' ? item.grade.toFixed(2) : item.grade}/20` : ''}
                    </div>
                    
                    ${item.caption?.goals?.fr || item.caption?.name ? `
                      <div class="item-desc">${cleanHtml(item.caption?.goals?.fr || item.caption?.name)}</div>
                    ` : ''}

                    ${item.exams && item.exams.length > 0 ? `
                      <table class="table">
                        <tr><th>Évaluations</th><td>${item.exams.map(e => `${e.typeName || e.type} (${e.weighting}%)`).join(', ')}</td></tr>
                      </table>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        `).join('')}

        <div class="footer">
            Document généré depuis l'application Chrysalide
        </div>
      </body>
      </html>
    `;
    return html;
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const html = generateFullPdfHtml(groupedSyllabus);
      const { uri } = await Print.printToFileAsync({ html });
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

  // Memoized syllabus item component to avoid setState during render
  const SyllabusItem = React.memo(({ syllabus, ...props }: { syllabus: Syllabus } & any) => {
    const subjectColor = React.useMemo(
      () => adjust(getSubjectColor(syllabus.caption?.name || syllabus.name), theme.dark ? 0.2 : -0.4),
      [syllabus.caption?.name, syllabus.name, theme.dark]
    );
    // Use caption?.name for lookup since that's what's registered in the store
    const subjectName = React.useMemo(
      () => getSubjectName(syllabus.caption?.name || syllabus.name),
      [syllabus.caption?.name, syllabus.name]
    );

    // Use getSubjectEmoji with caption.name since that's what's registered in the store
    const subjectEmoji = React.useMemo(
      () => getSubjectEmoji(syllabus.caption?.name || syllabus.name),
      [syllabus.caption?.name, syllabus.name]
    );

    const handlePress = useCallback(() => {
      router.push({
        pathname: '/(modals)/syllabus',
        params: { syllabusData: JSON.stringify(syllabus) },
      } as any);
    }, [syllabus, router]);

    return (
      <Item {...props} onPress={handlePress}>
        <Leading>
          <Stack width={36} height={36} card hAlign="center" vAlign="center" radius={32} backgroundColor={subjectColor + "22"}>
            <Text style={{ fontSize: 18 }}>{subjectEmoji}</Text>
          </Stack>
        </Leading>

        <Typography variant="title" numberOfLines={1} color={subjectColor}>
          {subjectName}
        </Typography>
        <Typography variant="caption" color="secondary">
          {syllabus.exams?.length || 0} {t("Syllabus_Exams", { count: syllabus.exams?.length || 0 })}
        </Typography>

        <Trailing>
          {syllabus.grade !== undefined && (
            <View
              style={{
                marginRight: 8,
                backgroundColor: subjectColor + "20",
                borderRadius: 8,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Typography
                variant="body2"
                color={subjectColor}
                style={{ fontWeight: "bold" }}
              >
                {typeof syllabus.grade === "number"
                  ? syllabus.grade.toFixed(2).replace(".00", "")
                  : syllabus.grade}
              </Typography>
            </View>
          )}
          <Papicons name="ChevronRight" size={18} color={colors.text + "44"} />
        </Trailing>
      </Item>
    );
  });
  SyllabusItem.displayName = 'Item';

  const renderSemesterSection = ({ item }: { item: { semester: number; ueGroups: { name: string; items: Syllabus[] }[] } }) => (
    <Stack style={{ marginBottom: 16 }}>
      <Typography variant="h6" color="secondary" style={{ marginBottom: 8, marginLeft: 4 }}>
        Semestre {item.semester}
      </Typography>
      <List>
        {item.ueGroups.flatMap((group) => [
          <View key={`header-${group.name}`} style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
            <Typography variant="body2" color="tertiary" style={{ fontSize: 13, textTransform: 'uppercase' }}>
              {group.name}
            </Typography>
          </View>,
          ...group.items.map((syllabus) => (
            <SyllabusItem key={syllabus.id} syllabus={syllabus} />
          )),
        ])}
      </List>
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
        keyExtractor={(item) => `semester-${item.semester}`}
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
