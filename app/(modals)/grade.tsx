import { Papicons } from '@getpapillon/papicons';
import { useRoute, useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { t } from "i18next";
import React from "react";
import { ScrollView, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";

import ModalOverhead, { ModalOverHeadScore } from '@/components/ModalOverhead';
import { extractSubjectCode, storage } from "@/services/auriga";
import { Syllabus } from '@/services/auriga/types';
import { Grade as SharedGrade } from "@/services/shared/grade";
import ContainedNumber from "@/ui/components/ContainedNumber";
import Icon from "@/ui/components/Icon";
import Stack from "@/ui/components/Stack";
import Typography from "@/ui/components/Typography";
import adjust from '@/utils/adjustColor';
import { colorCheck } from '@/utils/colorCheck';

interface SubjectInfo {
  name: string;
  originalName: string;
  color: string;
}

interface GradesModalProps {
  grade: SharedGrade;
  subjectInfo: SubjectInfo;
  avgInfluence: number;
  avgClass: number;
}

export default function GradesModal() {
  const router = useRouter();
  const { params } = useRoute();
  const theme = useTheme();
  const colors = theme.colors;

  if (!params) {
    return null;
  }
  const { grade, subjectInfo, avgInfluence = 0, avgClass = 0 } = params as GradesModalProps;

  return (
    <View style={{ overflow: "hidden", backgroundColor: colors.background, padding: 0, margin: 0 }}>
      <View style={{ overflow: "hidden" }}>
        <LinearGradient
          colors={[subjectInfo.color, colors.background]}
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 20,
          }}
          style={{
            backgroundColor: "transparent",
            overflow: "hidden"
          }}
        >
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginVertical: 16,
              width: "100%",
            }}
          >
            <ModalOverhead
              color={subjectInfo.color}
              subject={subjectInfo.name}
              title={grade.description}
              date={grade.givenAt ? new Date(grade.givenAt) : undefined}
              overhead={
                <ModalOverHeadScore
                  color={subjectInfo.color}
                  score={grade.studentScore?.disabled ? String(grade.studentScore?.status) : String(grade.studentScore?.value.toFixed(2))}
                  outOf={grade.outOf?.value}
                />
              }
            />

            {grade.studentScore?.value === grade.maxScore?.value && !grade.studentScore?.disabled &&
              <Stack direction="horizontal" gap={8} backgroundColor={adjust(subjectInfo.color, theme.dark ? 0.3 : -0.3)} vAlign='center' hAlign='center' padding={[12, 6]} radius={32} key={"bestgrade:" + theme.dark ? "dark" : "light"}>
                <Papicons size={20} name="crown" color={colorCheck("#FFFFFF", [adjust(subjectInfo.color, theme.dark ? 0.3 : -0.3)]) ? "#FFFFFF" : "#000000"} />
                <Typography color={colorCheck("#FFFFFF", [adjust(subjectInfo.color, theme.dark ? 0.3 : -0.3)]) ? "#FFFFFF" : "#000000"} variant='body2'>
                  {t("Modal_Grades_BestGrade")}
                </Typography>
              </Stack>
            }

            <Stack
              card
              direction="horizontal"
              width={"90%"}
              style={{ marginTop: 8 }}
            >
              <Stack
                width={"50%"}
                vAlign="center"
                hAlign="center"
                style={{ borderRightWidth: 1, borderRightColor: colors.border }}
                padding={12}
              >
                <Icon papicon opacity={0.5}>
                  <Papicons name={"Coefficient"} />
                </Icon>
                <Typography color="secondary">
                  {t("Grades_Coefficient")}
                </Typography>
                <ContainedNumber color={adjust(subjectInfo.color, theme.dark ? 0.3 : -0.3)}>
                  x{(grade.coefficient ?? 1).toFixed(2)}
                </ContainedNumber>
              </Stack>
              <Stack
                width={"50%"}
                vAlign="center"
                hAlign="center"
                padding={12}
                onPress={() => {
                  const data = storage.getString("auriga_syllabus");
                  const allSyllabus: Syllabus[] = data ? JSON.parse(data) : [];

                  const subjectCode = extractSubjectCode(subjectInfo.originalName);

                  const foundSyllabus = allSyllabus.find(s => {
                    const syllabusCode = extractSubjectCode(s.name);

                    if (subjectCode.startsWith(syllabusCode + "_") || subjectCode === syllabusCode) { return true; }

                    if (s.caption?.name === subjectInfo.originalName || s.caption?.name === subjectInfo.name) { return true; }

                    if (s.name === subjectInfo.originalName) { return true; }

                    return false;
                  });

                  if (foundSyllabus) {
                    router.push({
                      pathname: '/(modals)/syllabus',
                      params: { syllabusData: JSON.stringify(foundSyllabus) },
                    });
                  } else {
                    console.log("No syllabus found for", subjectInfo.originalName);
                  }
                }}
              >
                <Icon papicon opacity={0.5}>
                  <Papicons name={"ArrowRightUp"} />
                </Icon>
                <Typography color="secondary" style={{ textAlign: 'center' }}>
                  {t("Grades_Look_Syllabus")}
                </Typography>
              </Stack>
            </Stack>
          </View>
        </ScrollView>
      </View>
    </View>
  )
}