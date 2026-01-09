import { useTheme } from "@react-navigation/native";
import { Stack } from "expo-router";
import React, { useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from 'react-native-webview';

import OnboardingWebview from "@/components/onboarding/OnboardingWebview";

const INTRACOM_URL = "https://intracom.epita.fr/";

export default function AttendanceLoginScreen() {
    const webViewRef = useRef<WebView>(null);
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    return (
        // Print intracom login page
        <>
            <OnboardingWebview
                title="Connexion Intracom"
                color="#0078D4"
                step={1}
                totalSteps={1}
                hideSteps={true}
                webViewRef={webViewRef}
                webviewProps={{
                    source: { uri: INTRACOM_URL },
                    sharedCookiesEnabled: true,
                    javaScriptEnabled: true,
                    domStorageEnabled: true,
                    thirdPartyCookiesEnabled: true,
                    incognito: false,
                    cacheEnabled: true,
                }}
            />
        </>
    );
}