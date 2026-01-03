import { Papicons } from "@getpapillon/papicons";
import { useTheme } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Button from "@/ui/components/Button";
import Stack from "@/ui/components/Stack";
import Typography from "@/ui/components/Typography";
import ViewContainer from "@/ui/components/ViewContainer";

export default function WelcomeScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();


  return (
    <ViewContainer>
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "space-between" }]}>
        <Stack
          padding={32}
          backgroundColor="#0060D6"
          gap={0}
          hAlign={"center"}
          vAlign={"center"}
          style={{
            width: "100%",

            borderBottomLeftRadius: 42,
            borderBottomRightRadius: 42,
            borderCurve: "continuous",
            paddingTop: insets.top + 30,
            paddingBottom: 40,
          }}
        >
          <Stack vAlign="start" hAlign="start" width="100%" gap={6}>
            <Typography
              variant="h1"
              style={{ color: "white", fontSize: 32, lineHeight: 34 }}
            >
              {t("ONBOARDING_MAIN_TITLE")}
            </Typography>
            <Typography
              variant="h5"
              style={{ color: "#FFFFFF", lineHeight: 22, fontSize: 18 }}
            >
              {t("ONBOARDING_MAIN_DESCRIPTION")}
            </Typography>
          </Stack>
        </Stack>
        <Stack
          style={{
            padding: 20,
            paddingBottom: insets.bottom + 20,
          }}
          gap={10}
        >
          <Button
            title={t("ONBOARDING_START_BTN")}
            onPress={() => {
              requestAnimationFrame(() => {
                router.navigate("/(onboarding)/serviceSelection");
              });
            }}
            style={{
              backgroundColor: theme.dark ? colors.border : "black",
            }}
            size="large"
            icon={<Papicons name={"user"} />}
          />
          <Button
            title={t("ONBOARDING_HELP_BTN")}
            onPress={() => {
              Linking.openURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
            }}
            variant="ghost"
            color="text"
            size="large"
            style={{ height: 40 }}
          />
        </Stack>
      </View>
    </ViewContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
