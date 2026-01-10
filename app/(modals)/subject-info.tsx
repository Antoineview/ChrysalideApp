import { Papicons } from "@getpapillon/papicons";
import { useRoute, useTheme } from "@react-navigation/native";
import React from "react";
import { View } from "react-native";
import LinearGradient from "react-native-linear-gradient";

import ModalOverhead, { ModalOverHeadScore } from "@/components/ModalOverhead";
import Subject from "@/database/models/Subject";
import Stack from "@/ui/components/Stack";
import TableFlatList from "@/ui/components/TableFlatList";
import Typography from "@/ui/components/Typography";
import i18n from "@/utils/i18n";
import { getSubjectColor } from "@/utils/subjects/colors";
import { getSubjectEmoji } from "@/utils/subjects/emoji";
import { getSubjectName } from "@/utils/subjects/name";

const SubjectInfo = () => {
  const { params } = useRoute();
  const theme = useTheme();
  const colors = theme.colors;

  const subject: Subject = params?.subject;
  const subjectColor = getSubjectColor(subject?.name);
  const subjectName = getSubjectName(subject?.name);
  const subjectEmoji = getSubjectEmoji(subject?.name);

  const outOf = subject?.outOf?.value ?? 20;

  const averagesData = [
    {
      title: i18n.t("SubjectInfo_ClassAverage_Label"),
      subtitle: i18n.t("SubjectInfo_ClassAverage_Description"),
      disabled: subject?.classAverage?.disabled ?? true,
      value: subject?.classAverage?.value?.toFixed(2) ?? "N/A",
      status: subject?.classAverage?.status ?? "N/A",
      icon: "GraduationHat",
    },
    {
      title: i18n.t("SubjectInfo_MaxAverage_Label"),
      subtitle: i18n.t("SubjectInfo_MaxAverage_Description"),
      disabled: subject?.maximum?.disabled ?? true,
      value: subject?.maximum?.value?.toFixed(2) ?? "N/A",
      status: subject?.maximum?.status ?? "N/A",
      icon: "ArrowRightUp",
    },
    {
      title: i18n.t("SubjectInfo_MinAverage_Label"),
      subtitle: i18n.t("SubjectInfo_MinAverage_Description"),
      disabled: subject?.minimum?.disabled ?? true,
      value: subject?.minimum?.value?.toFixed(2) ?? "N/A",
      status: subject?.minimum?.status ?? "N/A",
      icon: "Minus",
    }
  ]

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
        contentInsetAdjustmentBehavior="never"
        engine='FlatList'
        ignoreHeaderHeight={true}
        scrollEnabled={false}
        style={{ backgroundColor: "transparent", zIndex: 1 }}

        ListHeaderComponent={
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginVertical: 20,
              width: "100%",
            }}
          >
            <ModalOverhead
              subject={subjectName}
              color={subjectColor}
              emoji={subjectEmoji}
              overtitle={i18n.t("Grades_SubjectInfo_NbGrades", { number: subject.grades.length })}
              overhead={
                <ModalOverHeadScore
                  color={subjectColor}
                  score={subject.studentAverage.disabled ? String(subject.studentAverage.status) : String(subject.studentAverage.value.toFixed(2))}
                  outOf={outOf}
                />
              }
            />
          </View>
        }

        sections={[]}
      />
    </>
  );
};

export default SubjectInfo;
