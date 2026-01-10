import { Stack, useRouter } from "expo-router";
import { useTheme } from "@react-navigation/native";
import React, { useRef, useCallback, useState } from "react";
import { Alert, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, WebViewNavigation } from 'react-native-webview';
import { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";

import OnboardingWebview from "@/components/onboarding/OnboardingWebview";
import OnboardingBackButton from "@/components/onboarding/OnboardingBackButton";
import ViewContainer from "@/ui/components/ViewContainer";
import StackLayout from "@/ui/components/Stack";
import Typography from "@/ui/components/Typography";
import Button from "@/ui/components/Button";

export default function NewsModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { colors } = theme;

    return (
        <ViewContainer>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <StackLayout
                    padding={32}
                    backgroundColor="#0078D4"
                    gap={20}
                    style={{
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        borderBottomLeftRadius: 42,
                        borderBottomRightRadius: 42,
                        borderCurve: "continuous",
                        paddingTop: insets.top + 20,
                        paddingBottom: 40,
                        minHeight: 250,
                    }}
                >
                    <StackLayout vAlign="start" hAlign="start" width="100%" gap={6}>
                        <Typography variant="h1" style={{ color: "white", fontSize: 32, lineHeight: 34 }}>
                            Intracom
                        </Typography>
                        <Typography variant="h5" style={{ color: "#FFFFFF", lineHeight: 22, fontSize: 18 }}>
                            Connecte-toi pour synchroniser les évènements.
                        </Typography>
                    </StackLayout>
                </StackLayout>

                <StackLayout
                    style={{ flex: 1, padding: 20, paddingBottom: insets.bottom + 20, justifyContent: 'space-between' }}
                    gap={16}
                >
                    <StackLayout gap={16}>
                        <Typography variant="body1" style={{ color: colors.text, opacity: 0.7, textAlign: 'center' }}>
                            Cela nous permettra d'afficher les forums et salons disponibles près de ton campus.
                        </Typography>
                    </StackLayout>
                </StackLayout>
            </View>

            <OnboardingBackButton />
        </ViewContainer>
    );
}