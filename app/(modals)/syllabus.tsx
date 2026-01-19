import { Papicons } from "@getpapillon/papicons";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Platform, StatusBar, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";

import { Syllabus } from "@/services/auriga/types";
import ContainedNumber from "@/ui/components/ContainedNumber";
import Icon from "@/ui/components/Icon";
import Stack from "@/ui/components/Stack";
import TableFlatList from "@/ui/components/TableFlatList";
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
  const { t } = useTranslation();
  const { colors, dark } = useTheme();
  const params = useLocalSearchParams<{ syllabusData: string }>();

  const [isLoading, setIsLoading] = React.useState(Platform.OS === 'android');

  const syllabus: Syllabus | null = React.useMemo(() => {
    try {
      return params.syllabusData ? JSON.parse(params.syllabusData) : null;
    } catch {
      return null;
    }
  }, [params.syllabusData]);

  const rawSubjectColor = React.useMemo(() =>
    getSubjectColor(syllabus?.caption?.name || syllabus?.name || ""),
    [syllabus]
  );

  const subjectColor = React.useMemo(() =>
    adjust(rawSubjectColor, dark ? 0.2 : -0.2),
    [rawSubjectColor, dark]
  );

  const subjectName = React.useMemo(() =>
    syllabus?.caption?.name || getSubjectName(syllabus?.name || ""),
    [syllabus]
  );

  const totalHours = React.useMemo(() => {
    if (syllabus?.duration && syllabus.duration > 0) {
      return Math.round(syllabus.duration / 3600);
    }
    return 0;
  }, [syllabus?.duration]);

  const activitiesHours = React.useMemo(() => {
    if (!syllabus?.activities) { return 0; }
    const totalActivitySeconds = syllabus.activities.reduce(
      (sum, activity) => sum + (activity.duration || 0),
      0
    );
    return Math.round(totalActivitySeconds / 3600);
  }, [syllabus?.activities]);

  const studentWorkHours = React.useMemo(() => {
    return Math.max(0, totalHours - activitiesHours);
  }, [totalHours, activitiesHours]);

  const rawDescription = syllabus?.caption?.goals?.fr || syllabus?.caption?.name;
  const description = React.useMemo(() => cleanHtml(rawDescription), [rawDescription]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !syllabus) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={rawSubjectColor || colors.primary} />
        <Typography variant="body1" style={{ marginTop: 16 }}>Chargement...</Typography>
      </View>
    );
  }

  const sections = [];

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
      items: syllabus.activities.map((activity) => ({
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
      items: syllabus.responsables.map((resp) => ({
        title: `${resp.firstName} ${resp.lastName}`,
      })),
    });
  }

  // Description Section
  if (description) {
    sections.push({
      title: "Description",
      icon: <Papicons name={"Paper"} />,
      items: [{
        title: description,
      }],
    });
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <LinearGradient
        colors={[rawSubjectColor, colors.background]}
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
              alignItems: "flex-start",
              justifyContent: "flex-start",
              gap: 16,
              marginVertical: 20,
            }}
          >
            <Typography variant="h2" color={subjectColor}>
              {subjectName}
            </Typography>

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
                    {syllabus.coeff ? `x${syllabus.coeff.toFixed(2)}` : t('Syllabus_Coeff_None')}
                  </ContainedNumber>
                </Stack>
              </Stack>

              {/* Horizontal Divider */}
              <View style={{ height: 1, backgroundColor: colors.border, width: "100%" }} />

              {/* Row 2: Duration & Student Work */}
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
                    Durée totale
                  </Typography>
                  <ContainedNumber color={subjectColor} denominator="h">
                    {totalHours}
                  </ContainedNumber>
                </Stack>
                {/* Student Work */}
                <Stack
                  width={"50%"}
                  vAlign="center"
                  hAlign="center"
                  padding={12}
                >
                  <Icon papicon opacity={0.5}>
                    <Papicons name={"Homework"} />
                  </Icon>
                  <Typography color="secondary">
                    Travail étudiant
                  </Typography>
                  <ContainedNumber color={subjectColor} denominator="h">
                    {studentWorkHours}
                  </ContainedNumber>
                </Stack>
              </Stack>

              {/* Horizontal Divider */}
              <View style={{ height: 1, backgroundColor: colors.border, width: "100%" }} />

              {/* Row 3: Min Score */}
              <Stack direction="horizontal" width={"100%"}>
                {/* Min Score */}
                <Stack
                  width={"100%"}
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
