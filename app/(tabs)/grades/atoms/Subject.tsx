import { Papicons } from '@getpapillon/papicons';
import { useTheme } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { t } from 'i18next';
import React, { useCallback, useMemo } from 'react';
import { Text, TouchableOpacity } from 'react-native';

import { Grade, Subject } from '@/services/shared/grade';
import Item, { Trailing } from '@/ui/components/Item';
import Stack from '@/ui/components/Stack';
import Typography from '@/ui/components/Typography';
import adjust from '@/utils/adjustColor';
import { getSubjectColor } from '@/utils/subjects/colors';
import { getSubjectEmoji } from '@/utils/subjects/emoji';
import { getSubjectName } from '@/utils/subjects/name';

const GradeItem = React.memo(({ grade, subjectName, subjectColor, onPress, getAvgInfluence, getAvgClassInfluence, isLast }: { grade: Grade, subjectName: string, subjectColor: string, onPress: (grade: Grade) => void, getAvgInfluence: (grade: Grade) => number, getAvgClassInfluence: (grade: Grade) => number, isLast?: boolean }) => {
  const dateString = useMemo(() => {
    // @ts-expect-error date type
    return grade.givenAt.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
  }, [grade.givenAt]);

  const handlePress = useCallback(() => {
    requestAnimationFrame(() => onPress(grade));
  }, [grade, onPress]);

  const theme = useTheme();

  const hasMaxScore = grade.studentScore?.value === grade.maxScore?.value && !grade.studentScore?.disabled;
  const trailingBackground = hasMaxScore ? adjust(subjectColor, theme.dark ? -0.2 : 0) : subjectColor + "15";
  const trailingForeground = hasMaxScore ? "#FFFFFF" : subjectColor;

  return (
    <Item isLast={isLast} onPress={handlePress}>
      <Typography variant='title' numberOfLines={2}>
        {grade.description ? grade.description : t('Grade_NoDescription', { subject: subjectName })}
      </Typography>
      <Typography variant='body2' color='secondary'>
        {dateString}
      </Typography>

      <Trailing>
        <Stack pointerEvents='none' noShadow direction='horizontal' gap={2} card hAlign='end' vAlign='end' padding={[9, 3]} radius={32} backgroundColor={trailingBackground} >
          {grade.alphaMark ? (
            <Typography color={trailingForeground} variant='navigation'>
              {grade.alphaMark === "VA" ? "Validé" : grade.alphaMark === "NV" ? "Non val." : grade.alphaMark}
            </Typography>
          ) : grade.studentScore?.disabled ? (
            <>
              <Typography color={trailingForeground} variant='navigation'>
                {grade.studentScore?.status}
              </Typography>
            </>
          ) : (
            <>
              <Typography color={trailingForeground} variant='navigation'>
                {grade.studentScore?.value.toFixed(2)}
              </Typography>
            </>
          )}
          {!grade.alphaMark && (
            <Typography color={trailingForeground + "99"} variant='body2'>
              /{grade.outOf.value}
            </Typography>
          )}

          {hasMaxScore && (
            <Papicons style={{ marginBottom: 3.5, marginLeft: 2 }} name="crown" color={trailingForeground} size={18} />
          )}
        </Stack>
      </Trailing >
    </Item >
  );
});

export const SubjectItem: React.FC<{ subject: Subject, grades: Grade[], getAvgInfluence: (grade: Grade) => number, getAvgClassInfluence: (grade: Grade) => number }> = React.memo(({ subject, grades, getAvgInfluence, getAvgClassInfluence }) => {
  const theme = useTheme();
  const navigation = useNavigation()

  // Memoize derived values
  const subjectAdjustedColor = useMemo(
    () => adjust(getSubjectColor(subject.name), theme.dark ? 0.2 : -0.4),
    [subject.name, theme.dark]
  );

  const subjectName = useMemo(() => getSubjectName(subject.name) || subject.name, [subject.name]);
  const subjectEmoji = useMemo(() => getSubjectEmoji(subject.name), [subject.name]);

  const handlePressSubject = useCallback(() => {
    // @ts-expect-error navigation types
    navigation.navigate('(modals)/subject-info', {
      subject: subject
    });
  }, [navigation, subject]);

  const handlePressGrade = useCallback(
    (grade: Grade) => {
      // @ts-expect-error navigation types
      navigation.navigate('(modals)/grade', {
        grade: grade,
        subjectInfo: {
          name: subjectName,
          color: subjectAdjustedColor,
          emoji: subjectEmoji,
          originalName: subject.name
        },
        avgInfluence: getAvgInfluence(grade),
        avgClass: getAvgClassInfluence(grade),
      });
    },
    [navigation, subjectName, subjectAdjustedColor, subjectEmoji, subject.name, grades]
  );

  return (
    <Stack style={{ width: "100%", marginBottom: subject.subjects ? 12 : 0 }} key={subject.id}>
      <TouchableOpacity style={{ width: '100%' }} activeOpacity={0.5} onPress={handlePressSubject}>
        <Stack direction='horizontal' hAlign='center' gap={10} padding={[4, 0]}>
          <Stack width={28} height={28} card hAlign='center' vAlign='center' radius={32} backgroundColor={subjectAdjustedColor + "22"}>
            <Text style={{ fontSize: 15 }}>
              {subjectEmoji}
            </Text>
          </Stack>

          <Stack style={{ flex: 1 }}>
            <Typography numberOfLines={1} ellipsizeMode="tail" variant='title' color={subjectAdjustedColor}>
              {subjectName || "?"}
            </Typography>
          </Stack>

          <Stack inline direction='horizontal' gap={1} hAlign='end' vAlign='end' style={{ flexShrink: 0 }}>
            {subject.isValidationOnly ? (
              <Typography variant='h5' inline style={{ marginTop: 0, fontSize: 17 }}>
                {subject.hasNonValidated ? "Non val." : "Validé"}
              </Typography>
            ) : subject.studentAverage.disabled ? (
              <Typography variant='h5' inline style={{ marginTop: 0 }}>
                {subject.studentAverage.status}
              </Typography>
            ) : (
              <Typography variant='h5' inline style={{ marginTop: 0, fontSize: 19 }}>
                {subject.studentAverage.value.toFixed(2)}
              </Typography>
            )}
            {!subject.isValidationOnly && (
              <Typography inline variant='body2' color={theme.colors.text + "99"} style={{ marginBottom: 4 }}>
                /{subject.outOf.value}
              </Typography>
            )}
          </Stack>
        </Stack>
      </TouchableOpacity>

      {subject.subjects ? (
        <Stack gap={12} style={{ marginTop: 6, width: "100%" }}>
          {subject.subjects.map((subSubject) => (
            <SubjectItem
              key={subSubject.id}
              subject={subSubject}
              grades={grades}
              getAvgInfluence={getAvgInfluence}
              getAvgClassInfluence={getAvgClassInfluence}
            />
          ))}
        </Stack>
      ) : (
        <Stack card gap={0} radius={20} style={{ marginTop: 6 }}>
          {subject.grades?.map((grade, index) => (
            <GradeItem
              key={grade.id}
              grade={grade}
              subjectName={subjectName}
              subjectColor={subjectAdjustedColor}
              onPress={handlePressGrade}
              getAvgInfluence={getAvgInfluence}
              getAvgClassInfluence={getAvgClassInfluence}
              isLast={index === (subject.grades?.length || 0) - 1} /// Re-added isLast logic
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
});

GradeItem.displayName = "GradeItem"
SubjectItem.displayName = "SubjectItem"