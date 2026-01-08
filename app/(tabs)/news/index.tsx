import { Papicons } from '@getpapillon/papicons';
import { useTheme } from '@react-navigation/native';
import { LiquidGlassView } from '@sbaiahmed1/react-native-blur';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Typography from '@/ui/components/Typography';
import { router } from 'expo-router';

const styles = StyleSheet.create({
  headerBtn: {
    width: "100%",
    flexDirection: "row",
    borderCurve: "circular",
    borderRadius: 20,
    padding: 10,
    gap: 8
  }
});

const NewsView = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const onPress = () => {
    router.push("/(modals)/news");
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, width: "100%", flex: 1 }}>
      <View style={{ height: insets.top + 56 }} />
      <LiquidGlassView
        glassOpacity={0.7}
        glassTintColor={colors.card}
        glassType='regular'
        isInteractive={true}
        style={{
          borderRadius: 22
        }}
      >
        <Pressable
          style={styles.headerBtn}
          onPress={onPress}
        >
          <View
            style={{
              backgroundColor: "#2B7ED6" + "30",
              borderRadius: 50,
              padding: 7
            }}
          >
            <Papicons name="newspaper" color="#2B7ED6" size={25} />
          </View>
          <View style={{
            flex: 1,
            overflow: 'hidden'
          }}>
            <Typography nowrap variant="h6" color={colors.text + "95"} style={{ lineHeight: 0 }}>{t("Tab_News")}</Typography>
            <Typography nowrap variant="title" color={colors.text + "60"} style={{ lineHeight: 0 }}>{t("Intracom")}</Typography>
          </View>
        </Pressable>
      </LiquidGlassView>
    </View>
  );
};

export default NewsView;