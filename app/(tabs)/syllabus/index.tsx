import { Papicons } from '@getpapillon/papicons';
import { LegendList } from '@legendapp/list';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, RefreshControl, Text, View } from 'react-native';
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
import { getSubjectName } from '@/utils/subjects/name';

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
    const filtered = syllabusList.filter((s) => {
      if (parcours === 'all') { return true; }

      if (parcours === 'PC') {
        // Show everything EXCEPT items with 'PA' in name
        return !s.name.includes('PA');
      }

      if (parcours === 'PA') {
        // Show everything EXCEPT items with 'PC' in name
        return !s.name.includes('PC');
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

  // Memoized syllabus item component to avoid setState during render
  const SyllabusItem = React.memo(({ syllabus, ...props }: { syllabus: Syllabus } & any) => {
    const subjectColor = React.useMemo(
      () => adjust(getSubjectColor(syllabus.name), theme.dark ? 0.2 : -0.4),
      [syllabus.name, theme.dark]
    );
    const subjectName = React.useMemo(() => getSubjectName(syllabus.name), [syllabus.name]);

    // Use a static emoji to avoid setState during render
    // The getSubjectEmoji function has side effects that can't be called during render
    const subjectEmoji = "📚";

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
          {syllabus.caption?.name || subjectName}
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
      />
    </View>
  );
};

export default SyllabusView;
