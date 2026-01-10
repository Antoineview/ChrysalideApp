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

const INTRACOM_URL = "https://intracom.epita.fr/";

const CALLBACK_PATTERN = /callback|code=|access_token=|token=/i;

let ACCESS_TOKEN: string | null = null;

// Fonction pour récupérer le token (null si non connecté)
export function getIntracomToken(): string | null {
    return ACCESS_TOKEN;
}

// Fonction pour vérifier si l'utilisateur est connecté
export function isIntracomConnected(): boolean {
    return ACCESS_TOKEN !== null;
}

export default function AttendanceLoginScreen() {
    const [showWebView, setShowWebView] = useState(false);
    const webViewRef = useRef<WebView>(null);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const hasIntercepted = useRef(false);
    const theme = useTheme();
    const { colors } = theme;

    const [accessToken, setAccessToken] = useState<string | null>(null);
    const extractTokenFromUrl = useCallback((url: string) => {
        try {
            const urlObj = new URL(url);
            const params: Record<string, string> = {};
            urlObj.searchParams.forEach((value, key) => {
                params[key] = value;
            });

            if (urlObj.hash) {
                const hashParams = new URLSearchParams(urlObj.hash.slice(1));
                hashParams.forEach((value, key) => {
                    params[key] = value;
                });
            }

            return {
                url: url,
                params: params,
                // Utilise access_token en priorité (le token opaque OAuth)
                token: params.access_token || params.id_token || params.token || params.code || null,
            };
        } catch (e) {
            console.error("Erreur parsing URL:", e);
            return null;
        }
    }, []);

    const handleShouldStartLoad = useCallback((request: ShouldStartLoadRequest): boolean => {
        const { url } = request;

        console.log("[Intracom Auth] Navigation URL:", url);

        if (CALLBACK_PATTERN.test(url) && !hasIntercepted.current) {
            hasIntercepted.current = true;

            const tokenData = extractTokenFromUrl(url);
            console.log("[Intracom Auth] Token data extracted:", JSON.stringify(tokenData, null, 2));

            if (tokenData) {
                if (tokenData.token) {
                    console.log("[Intracom Auth] Token type récupéré:",
                        tokenData.params.id_token ? "id_token (JWT)" :
                            tokenData.params.access_token ? "access_token" :
                                tokenData.params.token ? "token" :
                                    tokenData.params.code ? "code (OAuth)" : "unknown"
                    );
                    ACCESS_TOKEN = tokenData.token;
                    setAccessToken(tokenData.token);
                    setShowWebView(false);
                    router.back();
                }

                return false;
            }
        }

        return true;
    }, [extractTokenFromUrl, router]);

    const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
        console.log("[WebView] État navigation:", navState.url, "loading:", navState.loading);

        // Quand on arrive sur /home, c'est que le login est terminé
        // On injecte du JS pour récupérer le token Intracom
        if (navState.url.includes('/home') && !navState.loading && !hasIntercepted.current) {
            hasIntercepted.current = true;

            // Injecter du JavaScript pour récupérer le token depuis localStorage
            webViewRef.current?.injectJavaScript(`
                (function() {
                    // Le token Intracom est stocké dans ANMS-AUTH
                    let token = null;
                    try {
                        const authData = localStorage.getItem('ANMS-AUTH');
                        if (authData) {
                            const parsed = JSON.parse(authData);
                            token = parsed.token || null;
                        }
                    } catch (e) {
                        console.error('Erreur parsing ANMS-AUTH:', e);
                    }
                    
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'TOKEN_FOUND',
                        token: token
                    }));
                })();
                true;
            `);
        }
    }, []);

    const handleMessage = useCallback((event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log("[Intracom] Message reçu:", JSON.stringify(data, null, 2));

            if (data.type === 'TOKEN_FOUND') {
                if (data.token) {
                    console.log("[Intracom] Token Intracom récupéré!");
                    ACCESS_TOKEN = data.token;
                    setAccessToken(data.token);
                    setShowWebView(false);
                    router.back();
                } else {
                    console.log("[Intracom] Pas de token trouvé, clés disponibles:", data.allKeys);
                }
            }
        } catch (e) {
            console.error("[Intracom] Erreur parsing message:", e);
        }
    }, [router]);

    const handleLogin = () => {
        setShowWebView(true);
    };

    if (showWebView) {
        return (
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
                    onNavigationStateChange: handleNavigationStateChange,
                    onMessage: handleMessage,
                }}
            />
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

                    <StackLayout gap={10}>
                        <Button title="Se connecter" onPress={handleLogin} style={{ backgroundColor: "#0078D4" }} size="large" />
                    </StackLayout>
                </StackLayout>
            </View>

            <OnboardingBackButton />
        </ViewContainer>
    );
}