import { Papicons } from "@getpapillon/papicons";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Syllabus } from "@/services/auriga/types";
import ContainedNumber from "@/ui/components/ContainedNumber";
import Item, { Trailing } from "@/ui/components/Item";
import List from "@/ui/components/List";
import Stack from "@/ui/components/Stack";
import Typography from "@/ui/components/Typography";
import adjust from "@/utils/adjustColor";
import { getSubjectColor } from "@/utils/subjects/colors";
import { getSubjectName } from "@/utils/subjects/name";
import { getUeName } from "@/utils/ueParams";

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

export default function SyllabusModal() {
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ syllabusData: string }>();

  // Parse syllabus data from params
  const syllabus: Syllabus | null = React.useMemo(() => {
    try {
      return params.syllabusData ? JSON.parse(params.syllabusData) : null;
    } catch {
      return null;
    }
  }, [params.syllabusData]);

  if (!syllabus) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Typography variant="body1">Aucune donnée</Typography>
      </View>
    );
  }

  const subjectColor = adjust(getSubjectColor(syllabus.name), dark ? 0.2 : -0.2);
  const subjectName = syllabus.caption?.name || getSubjectName(syllabus.name);

  // Calculate total hours
  const totalHours = React.useMemo(() => {
    if (syllabus.duration && syllabus.duration > 0) {
      return Math.round(syllabus.duration / 3600);
    }
    return 0;
  }, [syllabus.duration]);

  // Description
  const rawDescription = syllabus.caption?.goals?.fr || syllabus.caption?.name;
  const description = React.useMemo(() => cleanHtml(rawDescription), [rawDescription]);

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Grabber Handle */}
      <View style={styles.grabberContainer}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
      </View>

      {/* Title Bar */}
      <View style={styles.titleBar}>
        <Pressable
          style={[styles.closeButton, { backgroundColor: colors.background }]}
          onPress={() => router.back()}
        >
          <Papicons name="ChevronDown" size={16} color={colors.text} />
        </Pressable>
        <Typography
          variant="title"
          numberOfLines={1}
          style={styles.title}
        >
          {subjectName}
        </Typography>
        {/* Spacer for alignment */}
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Grid - 2x2 */}
        <View style={[styles.infoGrid, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Row 1 */}
          <View style={styles.infoRow}>
            {/* UE */}
            <View style={[styles.infoCell, { borderRightWidth: 1, borderRightColor: colors.border }]}>
              <Papicons name="Paper" size={20} color={colors.text + "66"} />
              <Typography variant="body2" color="secondary">UE</Typography>
              <Typography variant="title" style={{ color: subjectColor }}>
                {getUeName(syllabus.UE)}
              </Typography>
            </View>
            {/* Coefficient */}
            <View style={styles.infoCell}>
              <Papicons name="Coefficient" size={20} color={colors.text + "66"} />
              <Typography variant="body2" color="secondary">Coefficient</Typography>
              <Typography variant="title" color="tertiary">
                x{(syllabus.coeff ?? 1).toFixed(2)}
              </Typography>
            </View>
          </View>
          {/* Separator */}
          <View style={[styles.infoSeparator, { backgroundColor: colors.border }]} />
          {/* Row 2 */}
          <View style={styles.infoRow}>
            {/* Durée */}
            <View style={[styles.infoCell, { borderRightWidth: 1, borderRightColor: colors.border }]}>
              <Papicons name="Clock" size={20} color={colors.text + "66"} />
              <Typography variant="body2" color="secondary">Durée</Typography>
              <Typography variant="title" style={{ color: subjectColor }}>
                {totalHours}h
              </Typography>
            </View>
            {/* Note Seuil */}
            <View style={styles.infoCell}>
              <Papicons name="Lock" size={20} color={colors.text + "66"} />
              <Typography variant="body2" color="secondary">Note Seuil</Typography>
              <Typography variant="title" color="tertiary">
                {syllabus.minScore > 0 ? `${syllabus.minScore.toFixed(2)}/20` : "—"}
              </Typography>
            </View>
          </View>
        </View>

        {/* Exams Section */}
        {syllabus.exams && syllabus.exams.length > 0 && (
          <Stack gap={8} style={{ marginTop: 20 }}>
            <View style={styles.sectionHeader}>
              <Papicons name="Grades" size={16} color={colors.text + "88"} />
              <Typography variant="body2" color="secondary">Examens</Typography>
            </View>
            <List>
              {syllabus.exams.map((exam, index) => (
                <Item key={exam.id || index}>
                  <Typography variant="title">
                    {exam.typeName || exam.type}
                  </Typography>
                  <Trailing>
                    <ContainedNumber color={subjectColor} denominator="%">
                      {exam.weighting}
                    </ContainedNumber>
                  </Trailing>
                </Item>
              ))}
            </List>
          </Stack>
        )}

        {/* Activities Section */}
        {syllabus.activities && syllabus.activities.length > 0 && (
          <Stack gap={8} style={{ marginTop: 20 }}>
            <View style={styles.sectionHeader}>
              <Papicons name="Sparkles" size={16} color={colors.text + "88"} />
              <Typography variant="body2" color="secondary">Activités</Typography>
            </View>
            <List>
              {syllabus.activities.map((activity, index) => (
                <Item key={activity.id || index}>
                  <Typography variant="title">
                    {activity.typeName || activity.type}
                  </Typography>
                  {!!activity.duration && activity.duration > 0 && (
                    <Trailing>
                      <ContainedNumber color={subjectColor} denominator="h">
                        {Math.round(activity.duration / 3600)}
                      </ContainedNumber>
                    </Trailing>
                  )}
                </Item>
              ))}
            </List>
          </Stack>
        )}

        {/* Responsables Section */}
        {syllabus.responsables && syllabus.responsables.length > 0 && (
          <Stack gap={8} style={{ marginTop: 20 }}>
            <View style={styles.sectionHeader}>
              <Papicons name="User" size={16} color={colors.text + "88"} />
              <Typography variant="body2" color="secondary">Responsables</Typography>
            </View>
            <List>
              {syllabus.responsables.map((resp, index) => (
                <Item key={resp.uid || index}>
                  <Typography variant="title">
                    {resp.firstName} {resp.lastName}
                  </Typography>
                </Item>
              ))}
            </List>
          </Stack>
        )}

        {/* Description Section */}
        {!!description && (
          <Stack gap={8} style={{ marginTop: 20 }}>
            <View style={styles.sectionHeader}>
              <Papicons name="Lock" size={16} color={colors.text + "88"} />
              <Typography variant="body2" color="secondary">Description</Typography>
            </View>
            <List>
              <Item>
                <Typography
                  variant="title"
                  numberOfLines={3}
                  style={{ lineHeight: 22 }}
                >
                  {description}
                </Typography>
              </Item>
            </List>
          </Stack>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  grabberContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 100,
  },
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  infoGrid: {
    borderRadius: 20,
    borderCurve: "continuous",
    borderWidth: 0.5,
    overflow: "hidden",
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
  },
  infoCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 4,
  },
  infoSeparator: {
    height: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
  },
});
