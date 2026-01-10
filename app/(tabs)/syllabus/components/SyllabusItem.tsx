import { Papicons } from '@getpapillon/papicons';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Syllabus } from '@/services/auriga/types';
import Typography from '@/ui/components/Typography';
import adjust from '@/utils/adjustColor';
import { getSubjectColor } from '@/utils/subjects/colors';
import { getSubjectName } from '@/utils/subjects/name';

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

interface SyllabusItemProps {
    syllabus: Syllabus;
}

const SyllabusItem = React.memo(({ syllabus }: SyllabusItemProps) => {
    const { t } = useTranslation();
    const { colors, dark } = useTheme();
    const router = useRouter();

    // Animation
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = useCallback(() => {
        scale.value = withTiming(0.97, { duration: 100 });
    }, [scale]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }, [scale]);

    // Subject color (magenta as default like in Figma)
    const subjectColor = React.useMemo(
        () => adjust(getSubjectColor(syllabus.caption?.name || syllabus.name), dark ? 0.2 : -0.2),
        [syllabus.caption?.name, syllabus.name, dark]
    );

    const subjectName = React.useMemo(
        () => getSubjectName(syllabus.caption?.name || syllabus.name),
        [syllabus.caption?.name, syllabus.name]
    );

    const handlePress = useCallback(() => {
        router.push({
            pathname: '/(modals)/syllabus',
            params: { syllabusData: JSON.stringify(syllabus) },
        });
    }, [syllabus, router]);

    // Calculate total hours from duration (which is in seconds)
    const totalHours = React.useMemo(() => {
        if (syllabus.duration && syllabus.duration > 0) {
            return Math.round(syllabus.duration / 3600);
        }
        // Fallback: sum of activity durations if available (also in seconds)
        const activitiesTotal = syllabus.activities?.reduce((acc, act) => acc + (act.duration || 0), 0) || 0;
        return activitiesTotal > 0 ? Math.round(activitiesTotal / 3600) : 0;
    }, [syllabus.duration, syllabus.activities]);

    const examCount = syllabus.exams?.length || 0;

    return (
        <AnimatedPressable
            style={[
                styles.container,
                {
                    backgroundColor: dark ? colors.card : '#f2f2f2',
                    shadowColor: dark ? '#000' : '#000',
                },
                animatedStyle,
            ]}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            {/* Main content area */}
            <View style={styles.content}>
                {/* Title */}
                <Typography
                    variant="title"
                    numberOfLines={1}
                    style={[styles.title, { color: dark ? colors.text : '#1e1e1e' }]}
                >
                    {subjectName}
                </Typography>

                {/* Badges row */}
                <View style={styles.badgesRow}>
                    {/* Exam count badge */}
                    {examCount > 0 && (
                        <View style={[styles.examBadge, { backgroundColor: subjectColor }]}>
                            <Text style={styles.examBadgeText}>
                                {examCount} {t("Syllabus_Exams", { count: examCount })}
                            </Text>
                        </View>
                    )}

                    {/* Hours indicator */}
                    {totalHours > 0 && (
                        <View style={styles.hoursContainer}>
                            <Typography variant="caption" color="secondary" style={styles.hoursText}>
                                {totalHours}h
                            </Typography>
                            <Papicons name="Clock" size={16} color={colors.text + '88'} />
                        </View>
                    )}
                </View>
            </View>

            {/* Coefficient badge */}
            {syllabus.coeff !== undefined && syllabus.coeff > 0 && (
                <View style={[styles.coeffContainer, { backgroundColor: subjectColor }]}>
                    <Text style={styles.coeffNumber}>{syllabus.coeff}</Text>
                    <Text style={styles.coeffLabel}>coeff</Text>
                </View>
            )}

            {/* Chevron if no coefficient */}
            {(syllabus.coeff === undefined || syllabus.coeff <= 0) && (
                <View style={styles.chevronContainer}>
                    <Papicons name="ChevronRight" size={18} color={colors.text + '44'} />
                </View>
            )}
        </AnimatedPressable>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'stretch',
        borderRadius: 25,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 3.3,
        elevation: 2,
        marginVertical: 4,
    },
    content: {
        flex: 1,
        gap: 7,
        paddingLeft: 13,
        paddingVertical: 13,
        paddingRight: 13,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.18,
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    examBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
    },
    examBadgeText: {
        fontFamily: 'Inter-Bold',
        fontWeight: 'bold',
        fontSize: 15,
        color: '#f2f2f2',
        letterSpacing: 0.15,
    },
    hoursContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    hoursText: {
        fontSize: 11,
        letterSpacing: 0.11,
    },
    coeffContainer: {
        width: 47,
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
        borderTopRightRadius: 25,
        borderBottomRightRadius: 25,
    },
    chevronContainer: {
        paddingRight: 16,
        paddingLeft: 8,
    },
    coeffNumber: {
        fontFamily: 'Inter-Bold',
        fontWeight: 'bold',
        fontSize: 27,
        color: 'white',
        letterSpacing: 0.27,
    },
    coeffLabel: {
        fontFamily: 'Inter-Bold',
        fontWeight: 'bold',
        fontSize: 7,
        color: 'white',
        letterSpacing: 0.07,
    },
});

SyllabusItem.displayName = 'SyllabusItem';

export default SyllabusItem;
