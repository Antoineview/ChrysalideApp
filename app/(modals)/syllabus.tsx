import { Papicons } from "@getpapillon/papicons";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { View } from "react-native";
import LinearGradient from "react-native-linear-gradient";

import ModalOverhead from "@/components/ModalOverhead";
import { Syllabus } from "@/services/auriga/types";
import ContainedNumber from "@/ui/components/ContainedNumber";
import Icon from "@/ui/components/Icon";
import Stack from "@/ui/components/Stack";
import TableFlatList from "@/ui/components/TableFlatList";
import Typography from "@/ui/components/Typography";
import adjust from "@/utils/adjustColor";
import { getSubjectColor } from "@/utils/subjects/colors";
import { getSubjectEmoji } from "@/utils/subjects/emoji";
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
  const subjectEmoji = getSubjectEmoji(syllabus.name);

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

  // Build sections for TableFlatList
  const sections = [];

  // Exams Section
  if (syllabus.exams && syllabus.exams.length > 0) {
    sections.push({
      title: "Examens",
      icon: <Papicons name={"Grades"} />,
      items: syllabus.exams.map((exam) => ({
        title: exam.typeName || exam.type,
        description: exam.description?.fr || exam.description?.en,
        trailing: (
          <ContainedNumber color={subjectColor} denominator="%">
            {exam.weighting}
          </ContainedNumber>
        ),
      })),
    });
  }

  // Activities Section
  if (syllabus.activities && syllabus.activities.length > 0) {
    sections.push({
      title: "Activités",
      icon: <Papicons name={"Sparkles"} />,
      items: syllabus.activities.map((activity, index) => ({
        title: activity.typeName || activity.type,
        trailing: activity.duration && activity.duration > 0 ? (
          <ContainedNumber color={subjectColor} denominator="h">
            {Math.round(activity.duration / 3600)}
          </ContainedNumber>
        ) : undefined,
      })),
    });
  }

  // Responsables Section
  if (syllabus.responsables && syllabus.responsables.length > 0) {
    sections.push({
      title: "Responsables",
      icon: <Papicons name={"User"} />,
      items: syllabus.responsables.map((resp, index) => ({
        title: `${resp.firstName} ${resp.lastName}`,
      })),
    });
  }

  // Description Section
  if (description) {
    sections.push({
      title: "Description",
      icon: <Papicons name={"Document"} />,
      items: [{
        title: description,
      }],
    });
  }

  return (
    <>
      <LinearGradient
        colors={[subjectColor, colors.background]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 300,
          width: "100%",
          zIndex: -9,
          opacity: 0.4
        }}
      />

      <TableFlatList
        engine="FlashList"
        sections={sections}
        ListHeaderComponent={
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginVertical: 20,
            }}
          >
            <ModalOverhead
              color={subjectColor}
              subject={subjectName}
            />

            {/* Info Grid - 2x2 fused */}
            <Stack
              card
              width={"100%"}
              style={{ marginTop: 8, position: "relative" }}
            >
              {/* Continuous Vertical Divider */}
              <View style={{
                position: "absolute",
                left: "50%",
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: colors.border,
                zIndex: 1,
              }} />

              {/* Row 1: UE & Coefficient */}
              <Stack direction="horizontal" width={"100%"}>
                {/* UE */}
                <Stack
                  width={"50%"}
                  vAlign="center"
                  hAlign="center"
                  padding={12}
                >
                  <Icon papicon opacity={0.5}>
                    <Papicons name={"Paper"} />
                  </Icon>
                  <Typography color="secondary">
                    UE
                  </Typography>
                  <ContainedNumber color={subjectColor}>
                    {getUeName(syllabus.UE)}
                  </ContainedNumber>
                </Stack>
                {/* Coefficient */}
                <Stack
                  width={"50%"}
                  vAlign="center"
                  hAlign="center"
                  padding={12}
                >
                  <Icon papicon opacity={0.5}>
                    <Papicons name={"Coefficient"} />
                  </Icon>
                  <Typography color="secondary">
                    Coefficient
                  </Typography>
                  <ContainedNumber color={subjectColor}>
                    x{(syllabus.coeff ?? 1).toFixed(2)}
                  </ContainedNumber>
                </Stack>
              </Stack>

              {/* Horizontal Divider */}
              <View style={{ height: 1, backgroundColor: colors.border, width: "100%" }} />

              {/* Row 2: Duration & Min Score */}
              <Stack direction="horizontal" width={"100%"}>
                {/* Duration */}
                <Stack
                  width={"50%"}
                  vAlign="center"
                  hAlign="center"
                  padding={12}
                >
                  <Icon papicon opacity={0.5}>
                    <Papicons name={"Clock"} />
                  </Icon>
                  <Typography color="secondary">
                    Durée
                  </Typography>
                  <ContainedNumber color={subjectColor} denominator="h">
                    {totalHours}
                  </ContainedNumber>
                </Stack>
                {/* Min Score */}
                <Stack
                  width={"50%"}
                  vAlign="center"
                  hAlign="center"
                  padding={12}
                >
                  <Icon papicon opacity={0.5}>
                    <Papicons name={"Lock"} />
                  </Icon>
                  <Typography color="secondary">
                    Note Seuil
                  </Typography>
                  <ContainedNumber color={subjectColor} denominator="/20">
                    {syllabus.minScore > 0 ? syllabus.minScore.toFixed(2) : "—"}
                  </ContainedNumber>
                </Stack>
              </Stack>
            </Stack>
          </View>
        }
        style={{ backgroundColor: "transparent" }}
      />
    </>
  );
}
