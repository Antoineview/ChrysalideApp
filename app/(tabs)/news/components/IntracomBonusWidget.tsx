import { withObservables } from '@nozbe/watermelondb/react';
import { useRouter } from 'expo-router';
import React from 'react';

import { getDatabaseInstance } from '@/database/DatabaseProvider';
import IntracomBonus from '@/database/models/IntracomBonus';

import HomeHeaderButton, { HomeHeaderButtonItem } from '../../index/components/HomeHeaderButton';

interface IntracomBonusWidgetProps {
    bonusRecords: IntracomBonus[];
}

const IntracomBonusWidget = ({ bonusRecords }: IntracomBonusWidgetProps) => {
    const router = useRouter();

    const bonus = bonusRecords.length > 0 ? bonusRecords[0].total : null;

    // Create a data item compatible with HomeHeaderButton
    const item: HomeHeaderButtonItem = {
        title: "Points bonus",
        icon: "star", // or 'award' if available, 'star' is safe
        color: "#FFA500", // Orange for bonus
        description: bonus !== null ? `${bonus}` : "...",
        onPress: () => {
            router.push("/(modals)/intracom-bonus-history");
        }
    };

    return (
        <HomeHeaderButton item={item} />
    );
};

const enhance = withObservables([], () => ({
    bonusRecords: getDatabaseInstance().get<IntracomBonus>('intracom_bonus').query(),
}));

export default enhance(IntracomBonusWidget);
