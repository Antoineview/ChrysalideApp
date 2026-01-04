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

    const FETCH_TOKEN_SCRIPT = `
      (function() {
        function checkAndPost(data, source) {
            if (data && data.access_token) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'TOKEN',
                    payload: {
                        access_token: data.access_token,
                        source: source
                    }
                }));
            }
        }

        // 1. Intercept Fetch Requests (Headers)
        var originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (options && options.headers && options.headers.Authorization) {
                var val = options.headers.Authorization;
                if (!url.toString().includes('microsoft') && !url.toString().includes('live.com')) {
                     checkAndPost({ access_token: val.replace('Bearer ', '') }, 'fetch-header');
                }
            }
            return originalFetch.apply(this, arguments).then(function(response) {
                // 2. Intercept Fetch Responses (Body)
                try {
                    var clone = response.clone();
                    clone.json().then(function(data) {
                        checkAndPost(data, 'fetch-response');
                    }).catch(function(){});
                } catch(e){}
                return response;
            });
        };

        // 3. Intercept XHR (Headers & Responses)
        var originalOpen = XMLHttpRequest.prototype.open;
        var originalSend = XMLHttpRequest.prototype.send;
        var originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
            if (header.toLowerCase() === 'authorization') {
                 checkAndPost({ access_token: value.replace('Bearer ', '') }, 'xhr-header');
            }
            return originalSetRequestHeader.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function() {
            var xhr = this;
            xhr.addEventListener('load', function() {
                try {
                    var data = JSON.parse(xhr.responseText);
                    checkAndPost(data, 'xhr-response');
                } catch(e) {}
            });
            return originalSend.apply(this, arguments);
        };

        // 4. Scrape Storage periodically
        setInterval(function() {
            // LocalStorage
            try {
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    var val = localStorage.getItem(key);
                    // Check if value looks like a token or JSON containing token
                    if (key.includes('token') || key.includes('auth')) {
                         try {
                             var json = JSON.parse(val);
                             checkAndPost(json, 'localstorage-json-' + key);
                         } catch(e) {
                             // maybe plain string?
                             if (val.length > 20) { // simple heuristic
                                // checkAndPost({ access_token: val }, 'localstorage-raw-' + key);
                             }
                         }
                    }
                }
                
                // SessionStorage
                 for (var i = 0; i < sessionStorage.length; i++) {
                    var key = sessionStorage.key(i);
                    var val = sessionStorage.getItem(key);
                     try {
                         var json = JSON.parse(val);
                         checkAndPost(json, 'sessionstorage-json-' + key);
                     } catch(e) {}
                }
            } catch(e) {}
        }, 1000);
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
