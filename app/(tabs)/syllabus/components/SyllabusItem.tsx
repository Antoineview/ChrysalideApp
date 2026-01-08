import { Papicons } from '@getpapillon/papicons';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Syllabus } from '@/services/auriga/types';
import Item, { Leading, Trailing } from '@/ui/components/Item';
import Stack from '@/ui/components/Stack';
import Typography from '@/ui/components/Typography';
import adjust from '@/utils/adjustColor';
import { getSubjectColor } from '@/utils/subjects/colors';
import { getSubjectEmoji } from '@/utils/subjects/emoji';
import { getSubjectName } from '@/utils/subjects/name';

type ItemProps = React.ComponentProps<typeof Item>;

interface SyllabusItemProps extends ItemProps {
    syllabus: Syllabus;
}

const SyllabusItem = React.memo(({ syllabus, ...props }: SyllabusItemProps) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    // We can't use useTheme() directly inside useMemo dependency if we want to extract it safely or we assume it's passed down? 
    // Actually useTheme is fine.
    const theme = useTheme();
    const router = useRouter();

    const subjectColor = React.useMemo(
        () => adjust(getSubjectColor(syllabus.caption?.name || syllabus.name), theme.dark ? 0.2 : -0.4),
        [syllabus.caption?.name, syllabus.name, theme.dark]
    );

    const subjectName = React.useMemo(
        () => getSubjectName(syllabus.caption?.name || syllabus.name),
        [syllabus.caption?.name, syllabus.name]
    );

    const subjectEmoji = React.useMemo(
        () => getSubjectEmoji(syllabus.caption?.name || syllabus.name),
        [syllabus.caption?.name, syllabus.name]
    );

    const handlePress = useCallback(() => {
        router.push({
            pathname: '/(modals)/syllabus',
            params: { syllabusData: JSON.stringify(syllabus) },
        });
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

// displayName must be 'Item' for the List component to correctly identify it 
// and avoid double-wrapping with extra padding/borders.
SyllabusItem.displayName = 'Item';

export default SyllabusItem;
