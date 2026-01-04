import { Stack } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

export default function SyllabusLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
