import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface DashedSeparatorProps {
    color?: string;
    dashWidth?: number;
    dashHeight?: number;
    dashGap?: number;
    style?: ViewStyle;
}

/**
 * A reusable dashed separator component using View-based approach.
 * Creates small rectangles spaced apart to simulate a dashed line.
 */
const DashedSeparator: React.FC<DashedSeparatorProps> = ({
    color = 'rgba(0, 68, 98, 0.5)',
    dashWidth = 8,
    dashHeight = 2,
    dashGap = 4,
    style,
}) => {
    // Generate enough dashes to fill the container
    const dashCount = 50; // Enough to overflow and be clipped

    return (
        <View style={[styles.container, style]}>
            {Array.from({ length: dashCount }).map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.dash,
                        {
                            backgroundColor: color,
                            width: dashWidth,
                            height: dashHeight,
                            marginRight: dashGap,
                            borderRadius: dashHeight / 2,
                        },
                    ]}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    dash: {
        // Individual dash styles applied inline
    },
});

export default DashedSeparator;
