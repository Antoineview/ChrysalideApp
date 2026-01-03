
import { useTheme } from "@react-navigation/native";
import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, WebViewNavigation } from 'react-native-webview';
import * as Crypto from 'expo-crypto';
import CookieManager from '@react-native-cookies/cookies';

import OnboardingBackButton from "@/components/onboarding/OnboardingBackButton";
import OnboardingWebview from "@/components/onboarding/OnboardingWebview";
import { useAlert } from "@/ui/components/AlertProvider";
import Button from "@/ui/components/Button";
import StackLayout from "@/ui/components/Stack";
import Typography from "@/ui/components/Typography";
import ViewContainer from "@/ui/components/ViewContainer";

import AurigaAPI from "@/services/auriga";
import { useAccountStore } from "@/stores/account";
import { Account, Services } from "@/stores/account/types";

const KEYCLOAK_AUTH_URL = "https://auriga.epita.fr";

export default function AurigaLoginScreen() {
    const [showWebView, setShowWebView] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState("Récupération de tes données Auriga");
    const webViewRef = useRef<WebView>(null);
    const alert = useAlert();
    const theme = useTheme();
    const { colors } = theme;
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { addAccount, setLastUsedAccount } = useAccountStore();

    // Track if we've already injected to avoid spamming
    const [hasInjected, setHasInjected] = useState(false);

    // XHR Interceptor - Catches the token response as it happens
    // This runs IMMEDIATELY when injected and hooks into all XHR requests
    const FETCH_TOKEN_SCRIPT = `
      (function() {
        // Hook into XMLHttpRequest to intercept the token response
        var originalOpen = XMLHttpRequest.prototype.open;
        var originalSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url) {
            this._auriga_url = url;
            this._auriga_method = method;
            return originalOpen.apply(this, arguments);
        };
        
        XMLHttpRequest.prototype.send = function() {
            var xhr = this;
            
            // Listen for the response
            xhr.addEventListener('load', function() {
                try {
                    // Check if this is a token endpoint response
                    if (xhr._auriga_url && xhr._auriga_url.includes('token')) {
                        var response = xhr.responseText;
                        var data = JSON.parse(response);
                        
                        if (data && data.access_token) {
                            console.log('[AURIGA INTERCEPT] Got token from:', xhr._auriga_url);
                            window.ReactNativeWebView.postMessage(JSON.stringify({ 
                                type: 'TOKEN', 
                                payload: { 
                                    access_token: data.access_token,
                                    id_token: data.id_token,
                                    refresh_token: data.refresh_token,
                                    source: 'XHR intercept: ' + xhr._auriga_url
                                } 
                            }));
                        }
                    }
                } catch(e) {
                    // Ignore parse errors for non-JSON responses
                }
            });
            
            return originalSend.apply(this, arguments);
        };
        
        // Also hook fetch API
        var originalFetch = window.fetch;
        window.fetch = function(url, options) {
            return originalFetch.apply(this, arguments).then(function(response) {
                // Clone the response so we can read it
                var clonedResponse = response.clone();
                
                if (typeof url === 'string' && url.includes('token')) {
                    clonedResponse.json().then(function(data) {
                        if (data && data.access_token) {
                            console.log('[AURIGA INTERCEPT] Got token from fetch:', url);
                            window.ReactNativeWebView.postMessage(JSON.stringify({ 
                                type: 'TOKEN', 
                                payload: { 
                                    access_token: data.access_token,
                                    id_token: data.id_token,
                                    refresh_token: data.refresh_token,
                                    source: 'fetch intercept: ' + url
                                } 
                            }));
                        }
                    }).catch(function() {});
                }
                
                return response;
            });
        };
        
        console.log('[AURIGA] XHR/Fetch interceptors installed');
        
        // Also do a quick scan after 3 seconds in case we missed it
        setTimeout(function() {
            var results = { type: 'DETECTIVE_REPORT', storage: {}, window: {} };
            
            // Quick storage scan
            try {
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    results.storage['LS:' + key] = (localStorage.getItem(key) || '').substring(0, 80);
                }
            } catch(e) {}
            
            // Check for keycloak globals
            if (window.keycloak) results.window['keycloak'] = 'found';
            if (window.Keycloak) results.window['Keycloak'] = 'found';
            
            // Look for interesting window keys
            try {
                var interesting = [];
                Object.keys(window).forEach(function(k) {
                    var lower = k.toLowerCase();
                    if (lower.includes('auth') || lower.includes('token') || lower.includes('keycloak')) {
                        interesting.push(k);
                    }
                });
                results.window['_interesting'] = interesting.join(', ');
            } catch(e) {}
            
            window.ReactNativeWebView.postMessage(JSON.stringify(results));
        }, 3000);
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
            const cookiesString = await getCookiesString("https://auriga.epita.fr");
            AurigaAPI.setToken(accessToken);
            AurigaAPI.setCookie(cookiesString);

            setSyncStatus("Récupération des notes et de l'emploi du temps...");
            await AurigaAPI.sync();

            const accountId = Crypto.randomUUID();
            const serviceId = Crypto.randomUUID();

            const newAccount: Account = {
                id: accountId,
                firstName: "Etudiant",
                lastName: "EPITA",
                schoolName: "EPITA",
                services: [{
                    id: serviceId,
                    serviceId: Services.MULTI,
                    auth: {
                        accessToken: accessToken,
                        additionals: { type: 'auriga', cookies: cookiesString }
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            addAccount(newAccount);
            setLastUsedAccount(accountId);

            alert.showAlert({
                title: "Connexion réussie",
                description: "Tu es maintenant connecté à Auriga.",
                icon: "Check",
                color: "#00D600"
            });

            router.replace("/(tabs)");

        } catch (error) {
            console.error("Auriga Sync Error:", error);
            alert.showAlert({
                title: "Erreur de synchronisation",
                description: "Impossible de récupérer tes données Auriga.",
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

        // Only inject on the welcome page (user is logged in)
        // And only if we haven't already started syncing
        if (url.includes("mainContent/welcome") && !isSyncing && !hasInjected) {
            setHasInjected(true);
            if (webViewRef.current) {
                console.log("Injecting Token Fetch Script (with 2s delay)...");
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
                } else {
                    console.warn("Received TOKEN message but no access_token found:", tokenData);
                }
            } else if (message.type === 'DETECTIVE_REPORT') {
                console.log("----- AURIGA DETECTIVE REPORT -----");
                console.log("Storage:", JSON.stringify(message.storage, null, 2));
                console.log("Keycloak:", JSON.stringify(message.keycloak, null, 2));
                console.log("-------------------------------------");
                // Reset injection flag to allow retry
                setHasInjected(false);
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
                    title="Connexion Microsoft"
                    color="#0078D4"
                    step={2}
                    totalSteps={2}
                    webViewRef={webViewRef}
                    webviewProps={{
                        source: { uri: KEYCLOAK_AUTH_URL },
                        onNavigationStateChange: handleNavigationStateChange,
                        onMessage: handleMessage,
                        injectedJavaScriptBeforeContentLoaded: FETCH_TOKEN_SCRIPT, // Inject BEFORE page scripts
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
                            Connexion Microsoft
                        </Typography>
                        <Typography variant="h5" style={{ color: "#FFFFFF", lineHeight: 22, fontSize: 18 }}>
                            Connecte-toi avec ton compte Microsoft EPITA pour accéder à Auriga.
                        </Typography>
                    </StackLayout>
                </StackLayout>

                <StackLayout
                    style={{ flex: 1, padding: 20, paddingBottom: insets.bottom + 20, justifyContent: 'space-between' }}
                    gap={16}
                >
                    <StackLayout gap={16}>
                        <Typography variant="body1" style={{ color: colors.text, opacity: 0.7, textAlign: 'center' }}>
                            Connecte-toi avec ton compte Microsoft EPITA.
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