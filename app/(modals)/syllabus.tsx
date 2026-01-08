import { useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Syllabus } from "@/services/auriga/types";
import Item from "@/ui/components/Item";
import List from "@/ui/components/List";
import Stack from "@/ui/components/Stack";
import Typography from "@/ui/components/Typography";
import adjust from "@/utils/adjustColor";
import { getSubjectColor } from "@/utils/subjects/colors";
import { getSubjectName } from "@/utils/subjects/name";

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
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
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

  const subjectColor = adjust(getSubjectColor(syllabus.name), -0.2);
  const subjectName = getSubjectName(syllabus.name);

  /* Description Section */
  const rawDescription = syllabus.caption?.goals?.fr || syllabus.caption?.name;
  const description = React.useMemo(() => cleanHtml(rawDescription), [
    rawDescription,
  ]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: insets.bottom + 32,
      }}
    >
      {/* Header */}
      <Stack gap={8} style={{ marginBottom: 24 }}>
        <Stack direction="horizontal" gap={12} hAlign="start">
          <Stack
            width={48}
            height={48}
            card
            hAlign="center"
            vAlign="center"
            radius={32}
            backgroundColor={subjectColor + "22"}
          >
            <Text style={{ fontSize: 24 }}>📚</Text>
          </Stack>
          <Stack gap={2} style={{ flex: 1 }}>
            <Typography
              variant="h5"
              style={{ lineHeight: 24 }}
              color={subjectColor}
              textBreakStrategy="highQuality"
              android_hyphenationFrequency="full"
              lineBreakStrategyIOS="standard"
            >
              {syllabus.caption?.name || subjectName}
            </Typography>
            <Typography variant="body2" color="secondary">
              {syllabus.code} • Semestre {syllabus.semester}
            </Typography>
          </Stack>
        </Stack>
      </Stack>

      {/* Info Section */}
      <Stack gap={8} style={{ marginBottom: 24 }}>
        <Typography variant="h6">Informations</Typography>
        <List>
          <Item>
            <Typography variant="title">{syllabus.UE}</Typography>
            <Typography variant="body2" color="secondary">
              UE
            </Typography>
          </Item>

          {syllabus.duration > 0 && (
            <Item>
              <Typography variant="title">
                {Math.round(syllabus.duration / 3600)}h
              </Typography>
              <Typography variant="body2" color="secondary">
                Durée
              </Typography>
            </Item>
          )}
          {syllabus.minScore > 0 && (
            <Item>
              <Typography variant="title">{syllabus.minScore}/20</Typography>
              <Typography variant="body2" color="secondary">
                Note minimum
              </Typography>
            </Item>
          )}

        </List>
      </Stack>

      {/* Exams Section */}
      {syllabus.exams && syllabus.exams.length > 0 && (
        <Stack gap={8} style={{ marginBottom: 24 }}>
          <Typography variant="h6">
            Examens ({syllabus.exams.length})
          </Typography>
          <List>
            {syllabus.exams.map((exam, index) => (
              <Item key={exam.id || index}>
                <Typography variant="title">
                  {exam.typeName || exam.type}
                </Typography>
                <Typography variant="body2" color="secondary">
                  Coefficient: {exam.weighting}%
                </Typography>
                {!!exam.description && (
                  <Typography
                    variant="body2"
                    color="tertiary"
                    style={{ marginTop: 4 }}
                  >
                    {cleanHtml(
                      typeof exam.description === "string"
                        ? exam.description
                        : exam.description[
                        i18n.language.startsWith("en") ? "en" : "fr"
                        ] ||
                        exam.description.fr ||
                        exam.description.en
                    )}
                  </Typography>
                )}
              </Item>
            ))}
          </List>
        </Stack>
      )}

      {/* Responsables Section */}
      {syllabus.responsables && syllabus.responsables.length > 0 && (
        <Stack gap={8} style={{ marginBottom: 24 }}>
          <Typography variant="h6">Responsables</Typography>
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

      {/* Activities Section */}
      {syllabus.activities && syllabus.activities.length > 0 && (
        <Stack gap={8} style={{ marginBottom: 24 }}>
          <Typography variant="h6">Activités</Typography>
          <List>
            {syllabus.activities.map((activity, index) => (
              <Item key={activity.id || index}>
                <Typography variant="title">
                  {activity.typeName || activity.type}
                </Typography>
                {!!activity.duration && activity.duration > 0 && (
                  <Typography variant="body2" color="secondary">
                    {Math.round(activity.duration / 3600)}h
                  </Typography>
                )}
              </Item>
            ))}
          </List>
        </Stack>
      )}

      {/* Description Section */}
      {!!description && (
        <Stack gap={8} style={{ marginBottom: 24 }}>
          <Typography variant="h6">Description</Typography>
          <Typography variant="body1">{description}</Typography>
        </Stack>
      )}

    </ScrollView>
  );
}
