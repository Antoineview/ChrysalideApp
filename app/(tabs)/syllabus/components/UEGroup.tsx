import { useTheme } from '@react-navigation/native';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import Typography from '@/ui/components/Typography';

interface UEGroupProps {
    name: string;
    children: React.ReactNode;
}

/**
 * UEGroup - A container component for grouping syllabus items by UE.
 * Displays a styled header with the UE name and contains syllabus items.
 */
const UEGroup: React.FC<UEGroupProps> = ({ name, children }) => {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header with UE name */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <Typography
                    variant="body2"
                    style={styles.headerText}
                >
                    {name.toUpperCase()}
                </Typography>
            </View>

            {/* Items container */}
            <View style={styles.itemsContainer}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 25,
        borderCurve: 'continuous',
        borderWidth: 0.5,
        overflow: 'hidden',
        // Shadow matching List component
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.10,
        shadowRadius: 1.5,
        elevation: 1,
    },
    header: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        paddingTop: 16,
    },
    headerText: {
        ...Platform.select({
            ios: {
                fontFamily: 'System',
                fontWeight: '900',
                fontStyle: 'italic',
            },
            android: {
                fontWeight: '900',
                fontStyle: 'italic',
            },
        }),
        fontSize: 18,
        letterSpacing: 1,
    },
    itemsContainer: {
        flexDirection: 'column',
        paddingHorizontal: 5,
        paddingTop: 5,
        paddingBottom: 5,
        gap: 7,
    },
});

UEGroup.displayName = 'UEGroup';

export default UEGroup;
