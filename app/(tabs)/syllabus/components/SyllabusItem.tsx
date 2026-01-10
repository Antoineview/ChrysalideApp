import { Papicons } from '@getpapillon/papicons';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Syllabus } from '@/services/auriga/types';
import Typography from '@/ui/components/Typography';
import adjust from '@/utils/adjustColor';
import { getSubjectColor } from '@/utils/subjects/colors';
import { getSubjectName } from '@/utils/subjects/name';

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

interface SyllabusItemProps {
    syllabus: Syllabus;
}

/**
 * SyllabusItem - A card-style component for displaying syllabus entries.
 * Inherits animation pattern from Item component but with custom Figma card layout.
 */
const SyllabusItem = React.memo(({ syllabus }: SyllabusItemProps) => {
    const { t } = useTranslation();
    const { colors, dark } = useTheme();
    const router = useRouter();

    // Animation pattern from Item component
    const animationValue = useSharedValue(0);
    const isAnimatingRef = useRef(false);

    const animatedStyle = useAnimatedStyle(() => {
        const progress = animationValue.value;
        return {
            transform: [{ scale: 1 - progress * 0.03 }],
            opacity: 1 - progress * 0.3,
        };
    }, []);

    const setAnimatingFalse = () => { isAnimatingRef.current = false; };

    const handlePressIn = useCallback(() => {
        if (isAnimatingRef.current) {
            animationValue.value = 0;
        }
        isAnimatingRef.current = true;
        animationValue.value = withTiming(1, {
            duration: 100,
            easing: Easing.out(Easing.exp)
        });
    }, [animationValue]);

    const handlePressOut = useCallback(() => {
        animationValue.value = withSpring(0, {
            mass: 1,
            damping: 15,
            stiffness: 300
        }, () => {
            'worklet';
            runOnJS(setAnimatingFalse)();
        });
    }, [animationValue]);

    // Subject color
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
        const activitiesTotal = syllabus.activities?.reduce((acc, act) => acc + (act.duration || 0), 0) || 0;
        return activitiesTotal > 0 ? Math.round(activitiesTotal / 3600) : 0;
    }, [syllabus.duration, syllabus.activities]);

    const examCount = syllabus.exams?.length || 0;
    const hasCoeff = syllabus.coeff !== undefined && syllabus.coeff > 0;

    return (
        <AnimatedPressable
            style={[
                styles.container,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
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
                    style={styles.title}
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
                            <Text style={[styles.hoursText, { color: colors.text }]}>
                                {totalHours}h
                            </Text>
                            <Papicons name="Clock" size={16} color={colors.text + '88'} />
                        </View>
                    )}
                </View>
            </View>

            {/* Coefficient badge - full height on right */}
            {hasCoeff ? (
                <View style={[styles.coeffContainer, { backgroundColor: subjectColor }]}>
                    <Text style={styles.coeffNumber}>{syllabus.coeff}</Text>
                    <Text style={styles.coeffLabel}>coeff</Text>
                </View>
            ) : (
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
        width: '100%',
        borderRadius: 20,
        borderCurve: 'continuous',
        overflow: 'hidden',
        // Border like List component
        borderWidth: 0.5,
        // Shadow for iOS (matching List component)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.10,
        shadowRadius: 1.5,
        // Shadow for Android
        elevation: 1,
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
        fontWeight: 'bold',
        fontSize: 15,
        color: '#f2f2f2',
    },
    hoursContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    hoursText: {
        fontSize: 13,
    },
    coeffContainer: {
        width: 47,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coeffNumber: {
        fontWeight: 'bold',
        fontSize: 27,
        color: 'white',
    },
    coeffLabel: {
        fontWeight: 'bold',
        fontSize: 7,
        color: 'white',
    },
    chevronContainer: {
        paddingRight: 16,
        paddingLeft: 8,
        justifyContent: 'center',
    },
});

SyllabusItem.displayName = 'SyllabusItem';

export default SyllabusItem;
