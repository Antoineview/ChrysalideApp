import React from 'react';
import { StyleSheet, View } from 'react-native';

import IntracomCard from '@/app/(tabs)/news/components/IntracomCard';
import Typography from '@/ui/components/Typography';

import { useIntracomWidgetData } from '../hooks/useIntracomWidgetData';

const HomeIntracomWidget = React.memo(() => {
    const { event } = useIntracomWidgetData();

    if (!event) {
        return (
            <View style={styles.emptyContainer}>
                <Typography variant="body2" style={{ opacity: 0.6 }}>
                    Aucun événement à venir
                </Typography>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <IntracomCard
                event={event}
                hideRegisterButton={false}
                readOnly={false}
                borderRadius={18}
                style={{ marginBottom: 0 }}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: 10,
        paddingBottom: 7,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    }
});

export default HomeIntracomWidget;
