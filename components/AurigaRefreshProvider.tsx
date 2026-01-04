import CookieManager from "@react-native-cookies/cookies";
import { useRouter } from "expo-router";
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useRef,
    useState,
} from "react";
import { View } from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";

import AurigaAPI from "@/services/auriga";
import { initializeAccountManager } from "@/services/shared";
import { useAccountStore } from "@/stores/account";
import { useAlert } from "@/ui/components/AlertProvider";

const KEYCLOAK_AUTH_URL = "https://auriga.epita.fr";

// XHR Interceptor script - same as in aurigaAuth.tsx
const FETCH_TOKEN_SCRIPT = `
  (function() {
    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url) {
        this._auriga_url = url;
        this._auriga_method = method;
        return originalOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function() {
        var xhr = this;
        
        xhr.addEventListener('load', function() {
            try {
                if (xhr._auriga_url && xhr._auriga_url.includes('token')) {
                    var response = xhr.responseText;
                    var data = JSON.parse(response);
                    
                    if (data && data.access_token) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ 
                            type: 'TOKEN', 
                            payload: { 
                                access_token: data.access_token,
                                source: 'XHR intercept'
                            } 
                        }));
                    }
                }
            } catch(e) {}
        });
        
        return originalSend.apply(this, arguments);
    };
    
    var originalFetch = window.fetch;
    window.fetch = function(url, options) {
        return originalFetch.apply(this, arguments).then(function(response) {
            var clonedResponse = response.clone();
            
            if (typeof url === 'string' && url.includes('token')) {
                clonedResponse.json().then(function(data) {
                    if (data && data.access_token) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ 
                            type: 'TOKEN', 
                            payload: { 
                                access_token: data.access_token,
                                source: 'fetch intercept'
                            } 
                        }));
                    }
                }).catch(function() {});
            }
            
            return response;
        });
    };
  })();
  true;
`;

type AurigaRefreshContextType = {
    refreshAuriga: () => void;
    isRefreshing: boolean;
};

const AurigaRefreshContext = createContext<AurigaRefreshContextType | undefined>(undefined);

export const useAurigaRefresh = () => {
    const context = useContext(AurigaRefreshContext);
    if (!context) {
        throw new Error("useAurigaRefresh must be used within an AurigaRefreshProvider");
    }
    return context;
};

interface AurigaRefreshProviderProps {
    children: ReactNode;
}

export const AurigaRefreshProvider = ({ children }: AurigaRefreshProviderProps) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showHiddenWebView, setShowHiddenWebView] = useState(false);
    const webViewRef = useRef<WebView>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasReceivedToken = useRef(false);
    const router = useRouter();
    const alert = useAlert();

    const getCookiesString = async () => {
        try {
            const allCookies = await CookieManager.getAll(true);
            const relevantCookies: string[] = [];
            Object.values(allCookies).forEach((c: any) => {
                relevantCookies.push(`${c.name}=${c.value}`);
            });
            return relevantCookies.join("; ");
        } catch (e) {
            return "";
        }
    };

    const performSync = async (accessToken: string) => {
        try {
            const cookiesString = await getCookiesString();
            AurigaAPI.setToken(accessToken);
            AurigaAPI.setCookie(cookiesString);

            await AurigaAPI.sync();

            const { accounts } = useAccountStore.getState();
            const existingAccount = accounts.find((acc) =>
                acc.services.some((s) => s.auth?.additionals?.type === "auriga")
            );

            if (existingAccount) {
                const aurigaService = existingAccount.services.find(
                    (s) => s.auth?.additionals?.type === "auriga"
                );
                if (aurigaService) {
                    useAccountStore.getState().updateServiceAuthData(aurigaService.id, {
                        accessToken: accessToken,
                        additionals: { type: "auriga", cookies: cookiesString },
                    });
                }
            }

            await initializeAccountManager();

            alert.showAlert({
                id: "auriga-sync",
                title: "Synchronisation terminée",
                message: "Tes données Auriga sont à jour.",
                icon: "Check",
                color: "#00D600",
            });
        } catch (error) {
            console.error("Background Auriga Sync Error:", error);
            alert.showAlert({
                id: "auriga-sync",
                title: "Erreur de synchronisation",
                message: "Impossible de récupérer tes données Auriga.",
                icon: "AlertCircle",
                color: "#D60000",
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleMessage = async (event: any) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);

            if (message.type === "TOKEN" && !hasReceivedToken.current) {
                hasReceivedToken.current = true;

                // Clear timeout since we got the token
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }

                setShowHiddenWebView(false);

                alert.showAlert({
                    id: "auriga-sync",
                    title: "Synchronisation en cours",
                    message: "Récupération de tes données Auriga...",
                    icon: "RefreshCw",
                    color: "#0078D4",
                    delay: 60000, // Will be replaced when sync completes
                });

                // Sync in background
                await performSync(message.payload.access_token);
            }
        } catch (e) {
            console.error("Failed to parse WebView message:", e);
        }
    };

    const handleNavigationStateChange = (navState: WebViewNavigation) => {
        // Just log for debugging
        console.log("[AurigaRefresh] WebView Nav:", navState.url);
    };

    const refreshAuriga = useCallback(() => {
        if (isRefreshing) { return; }

        setIsRefreshing(true);
        hasReceivedToken.current = false;
        setShowHiddenWebView(true);

        alert.showAlert({
            title: "Rafraîchissement",
            message: "Connexion à Auriga...",
            icon: "RefreshCw",
            color: "#0078D4",
            delay: 3000,
        });

        // Set timeout - if no token after 3 seconds, navigate to auth screen
        timeoutRef.current = setTimeout(() => {
            if (!hasReceivedToken.current) {
                setShowHiddenWebView(false);
                setIsRefreshing(false);
                router.push("/(onboarding)/university/multi/aurigaAuth?refresh=true" as any);
            }
        }, 3000);
    }, [isRefreshing, alert, router]);

    return (
        <AurigaRefreshContext.Provider value={{ refreshAuriga, isRefreshing }}>
            {children}

            {/* Hidden WebView for background token acquisition */}
            {showHiddenWebView && (
                <View style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}>
                    <WebView
                        ref={webViewRef}
                        source={{ uri: KEYCLOAK_AUTH_URL }}
                        onNavigationStateChange={handleNavigationStateChange}
                        onMessage={handleMessage}
                        injectedJavaScriptBeforeContentLoaded={FETCH_TOKEN_SCRIPT}
                        sharedCookiesEnabled={true}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        thirdPartyCookiesEnabled={true}
                        incognito={false}
                        cacheEnabled={true}
                    />
                </View>
            )}
        </AurigaRefreshContext.Provider>
    );
};
