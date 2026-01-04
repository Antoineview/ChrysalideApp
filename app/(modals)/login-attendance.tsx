import { useTheme } from "@react-navigation/native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, WebViewNavigation } from 'react-native-webview';
import CookieManager from '@react-native-cookies/cookies';

import OnboardingBackButton from "@/components/onboarding/OnboardingBackButton";
import OnboardingWebview from "@/components/onboarding/OnboardingWebview";
import { useAlert } from "@/ui/components/AlertProvider";
import Button from "@/ui/components/Button";
import StackLayout from "@/ui/components/Stack";
import Typography from "@/ui/components/Typography";
import ViewContainer from "@/ui/components/ViewContainer";

import AbsencesAPI from "@/services/absences";

const ABSENCES_AUTH_URL = "https://absences.epita.net/";

export default function AttendanceLoginScreen() {
    const [showWebView, setShowWebView] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState("Récupération de tes absences");
    const webViewRef = useRef<WebView>(null);
    const alert = useAlert();
    const theme = useTheme();
    const { colors } = theme;
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const params = useLocalSearchParams();
    const isRefresh = params.refresh === "true";

    React.useEffect(() => {
        if (isRefresh) {
            setShowWebView(true);
            setHasInjected(false);
        }
    }, [isRefresh]);

    const [hasInjected, setHasInjected] = useState(false);

    // Interceptor - Catches the token from Authorization header or specific responses
    const FETCH_TOKEN_SCRIPT = `
      (function() {
        var originalFetch = window.fetch;
        window.fetch = function(url, options) {
            
            // Check if this request has an Authorization header
            if (options && options.headers && options.headers.Authorization) {
                var urlString = url.toString();
                
                // We want to capture the token sent to the Absences API, NOT to Microsoft Graph or Login
                var isMicrosoft = urlString.includes("microsoft") || urlString.includes("live.com") || urlString.includes("office.com");
                
                if (!isMicrosoft) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'TOKEN',
                        payload: {
                            access_token: options.headers.Authorization.replace('Bearer ', ''),
                            source: 'fetch intercept: ' + urlString
                        }
                    }));
                }
            }
            
            return originalFetch.apply(this, arguments);
        };
        
        var originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
            if (header.toLowerCase() === 'authorization') {
                // XHR requests don't always give us the URL easily in setRequestHeader, 
                // but usually the main app XHRs are for the API.
                // We'll capture it, but the fetch interceptor is usually more reliable for modern React apps.
                 window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'TOKEN',
                    payload: {
                        access_token: value.replace('Bearer ', ''),
                        source: 'xhr intercept'
                    }
                }));
            }
            return originalSetRequestHeader.apply(this, arguments);
        };
      })();
      true;
    `;

    const getCookiesString = async (url: string) => {
        try {
            const allCookies = await CookieManager.getAll(true);
            const relevantCookies: string[] = [];
            Object.values(allCookies).forEach((c: any) => {
                relevantCookies.push(`${c.name}=${c.value}`);
            });
            return relevantCookies.join('; ');
        } catch (e) {
            return "";
        }
    }

    const startSync = async (accessToken: string) => {
        if (isSyncing) return;
        setIsSyncing(true);
        setShowWebView(false);

        try {
            AbsencesAPI.setToken(accessToken);

            setSyncStatus("Synchronisation des absences...");
            await AbsencesAPI.sync();

            alert.showAlert({
                title: "Connexion réussie",
                description: "Tu es maintenant connecté aux absences.",
                icon: "Check",
                color: "#00D600"
            });

            router.back();

        } catch (error) {
            console.error("Absences Sync Error:", error);
            alert.showAlert({
                title: "Erreur de synchronisation",
                description: "Impossible de récupérer tes absences.",
                icon: "Error",
                color: "#D60000"
            });
            setIsSyncing(false);
            setShowWebView(true);
        }
    };

    const handleNavigationStateChange = async (navState: WebViewNavigation) => {
        const { url } = navState;
        console.log("WebView Nav:", url);

        if (!isSyncing && !hasInjected && !url.includes("login.microsoftonline.com")) {
            setHasInjected(true);
            if (webViewRef.current) {
                console.log("Injecting Token Interceptor...");
                webViewRef.current.injectJavaScript(FETCH_TOKEN_SCRIPT);
            }
        }
    };

    const handleMessage = async (event: any) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);
            console.log("WebView Message:", message.type);

            if (message.type === 'TOKEN') {
                const tokenData = message.payload;
                if (tokenData && tokenData.access_token) {
                    console.log("SUCCESS! Token found from:", tokenData.source);
                    await startSync(tokenData.access_token);
                }
            }
        } catch (e) {
            console.error("Failed to parse WebView message:", e);
        }
    };

    const handleLogin = () => {
        setShowWebView(true);
        setHasInjected(false);
    };

    if (isSyncing) {
        return (
            <ViewContainer>
                <StackLayout vAlign="center" hAlign="center" style={{ flex: 1, backgroundColor: colors.background }} gap={20}>
                    <ActivityIndicator size="large" color="#0078D4" />
                    <Typography variant="h3">Synchronisation...</Typography>
                    <Typography variant="body1" style={{ opacity: 0.7 }}>{syncStatus}</Typography>
                </StackLayout>
            </ViewContainer>
        );
    }

    if (showWebView) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <OnboardingWebview
                    title="Connexion Absences"
                    color="#0078D4"
                    step={1}
                    totalSteps={1}
                    webViewRef={webViewRef}
                    webviewProps={{
                        source: { uri: ABSENCES_AUTH_URL },
                        onNavigationStateChange: handleNavigationStateChange,
                        onMessage: handleMessage,
                        injectedJavaScriptBeforeContentLoaded: FETCH_TOKEN_SCRIPT,
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
                            Absences
                        </Typography>
                        <Typography variant="h5" style={{ color: "#FFFFFF", lineHeight: 22, fontSize: 18 }}>
                            Connecte-toi avec ton compte Microsoft EPITA pour synchroniser tes absences.
                        </Typography>
                    </StackLayout>
                </StackLayout>

                <StackLayout
                    style={{ flex: 1, padding: 20, paddingBottom: insets.bottom + 20, justifyContent: 'space-between' }}
                    gap={16}
                >
                    <StackLayout gap={16}>
                        <Typography variant="body1" style={{ color: colors.text, opacity: 0.7, textAlign: 'center' }}>
                            Cela nous permettra de récupérer ton historique de présence.
                        </Typography>
                    </StackLayout>

                    <StackLayout gap={10}>
                        <Button title="Se connecter" onPress={handleLogin} style={{ backgroundColor: "#0078D4" }} size="large" />
                    </StackLayout>
                </StackLayout>
            </View>

            <OnboardingBackButton />
        </ViewContainer>
    );
}
