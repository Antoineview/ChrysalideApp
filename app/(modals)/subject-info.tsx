import { Papicons } from "@getpapillon/papicons";
import { useRoute, useTheme } from "@react-navigation/native";
import React from "react";
import { View } from "react-native";
import LinearGradient from "react-native-linear-gradient";

import { useRouter } from "expo-router";

import ModalOverhead, { ModalOverHeadScore } from "@/components/ModalOverhead";
import Subject from "@/database/models/Subject";
import { extractSubjectCode, storage } from "@/services/auriga";
import { Syllabus } from "@/services/auriga/types";
import Icon from "@/ui/components/Icon";
import Stack from "@/ui/components/Stack";
import TableFlatList from "@/ui/components/TableFlatList";
import Typography from "@/ui/components/Typography";
import i18n from "@/utils/i18n";
import { getSubjectColor } from "@/utils/subjects/colors";
import { getSubjectEmoji } from "@/utils/subjects/emoji";
import { getSubjectName } from "@/utils/subjects/name";

const SubjectInfo = () => {
  const router = useRouter();
  const { params } = useRoute();
  const theme = useTheme();
  const colors = theme.colors;

  const subject: Subject = (params as any)?.subject;
  const subjectColor = getSubjectColor(subject?.name);
  const subjectName = getSubjectName(subject?.name);
  const subjectEmoji = getSubjectEmoji(subject?.name);

  const outOf = subject?.outOf?.value ?? 20;

  return (
    <View style={{ overflow: "hidden", backgroundColor: colors.background, padding: 0, margin: 0 }}>
      <View style={{ overflow: "hidden" }}>
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
            opacity: 0.4,
          }}
        />

        <View
          style={{
            backgroundColor: "transparent",
            overflow: "hidden",
            paddingBottom: 0,
          }}
        >
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginTop: 16,
              marginBottom: 0,
              width: "100%",
            }}
          >
            <ModalOverhead
              subject={subjectName}
              color={subjectColor}
              overtitle={i18n.t("Grades_SubjectInfo_NbGrades", { number: subject.grades.length })}
              overhead={
                <ModalOverHeadScore
                  color={subjectColor}
                  score={subject.studentAverage.disabled ? String(subject.studentAverage.status) : String(subject.studentAverage.value.toFixed(2))}
                  outOf={outOf}
                />
              }
            />

            <Stack
              card
              width={"90%"}
              style={{ alignItems: "center", justifyContent: "center", marginTop: 8, padding: 12, marginBottom: 100 }}
              onPress={() => {
                const data = storage.getString("auriga_syllabus");
                const allSyllabus: Syllabus[] = data ? JSON.parse(data) : [];

                const subjectCode = extractSubjectCode(subject.name);

                const foundSyllabus = allSyllabus.find(s => {
                  const syllabusCode = extractSubjectCode(s.name);

                  if (subjectCode.startsWith(syllabusCode + "_") || subjectCode === syllabusCode) return true;

                  if (s.caption?.name === subject.name || s.caption?.name === subjectName) return true;

                  if (s.name === subject.name) return true;

                  return false;
                });

                if (foundSyllabus) {
                  router.push({
                    pathname: '/(modals)/syllabus',
                    params: { syllabusData: JSON.stringify(foundSyllabus) },
                  });
                } else {
                  console.log("No syllabus found for", subject.name);
                }
              }}
            >
              <Stack
                direction="horizontal"
                vAlign="center"
                hAlign="center"
                padding={12}
                gap={12}
              >
                <Icon papicon opacity={0.5}>
                  <Papicons name={"ArrowRightUp"} />
                </Icon>
                <Typography color="secondary" style={{ textAlign: 'center' }}>
                  {i18n.t("Grades_Look_Syllabus")}
                </Typography>
              </Stack>
            </Stack>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SubjectInfo;
