import { useTheme } from "@react-navigation/native";
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

import OnboardingBackButton from "@/components/onboarding/OnboardingBackButton";
import { useAlert } from "@/ui/components/AlertProvider";
import Button from "@/ui/components/Button";
import StackLayout from "@/ui/components/Stack";
import Typography from "@/ui/components/Typography";
import ViewContainer from "@/ui/components/ViewContainer";

// Required for Android to return the auth result
WebBrowser.maybeCompleteAuthSession();

export default function AurigaLoginScreen() {
    const [result, setResult] = useState<{ type: string; url?: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const alert = useAlert();
    const theme = useTheme();
    const { colors } = theme;
    const insets = useSafeAreaInsets();

    const LOGIN_URL = "https://login.microsoftonline.com/3534b3d7-316c-4bc9-9ede-605c860f49d2/oauth2/v2.0/authorize?scope=openid+profile+email&state=CHg61gg5BomQGCi943xDz_K_Y4M-AWFPkDV_aEryzFk.vdI9jwfruJg.2dqw7iD6R4OVLsJiv__8Ig&response_type=code&client_id=5ba7da34-9df6-4a44-9042-82ac5b04b9fb&redirect_uri=https%3A%2F%2Fionisepita-auth.np-auriga.nfrance.net%2Fauth%2Frealms%2Fnpionisepita%2Fbroker%2Foidc%2Fendpoint&prompt=login&nonce=nQVgSoYOo8Svwi6B5enHsA";

    const handleLogin = async () => {
        try {
            setLoading(true);
            const authResult = await WebBrowser.openAuthSessionAsync(
                LOGIN_URL,
                null
            );

            setResult(authResult);

            if (authResult.type === 'success' && authResult.url) {
                alert.showAlert({
                    title: "Connexion réussie",
                    description: "Retour à l'application validé.",
                    icon: "Check",
                    color: "#00D600"
                });
            }
        } catch (error) {
            // Handle error silently
        } finally {
            setLoading(false);
        }
    };

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
                        <Typography
                            variant="h1"
                            style={{ color: "white", fontSize: 32, lineHeight: 34 }}
                        >
                            Connexion Microsoft
                        </Typography>
                        <Typography
                            variant="h5"
                            style={{ color: "#FFFFFF", lineHeight: 22, fontSize: 18 }}
                        >
                            Connecte-toi avec ton compte Microsoft EPITA pour accéder à Auriga.
                        </Typography>
                    </StackLayout>
                </StackLayout>

                <StackLayout
                    style={{
                        flex: 1,
                        padding: 20,
                        paddingBottom: insets.bottom + 20,
                        justifyContent: 'space-between',
                    }}
                    gap={16}
                >
                    <StackLayout gap={16}>
                        <Typography variant="body1" style={{ color: colors.text, opacity: 0.7, textAlign: 'center' }}>
                            Tu seras redirigé vers la page de connexion Microsoft dans ton navigateur.
                        </Typography>
                    </StackLayout>

                    <StackLayout gap={10}>
                        <Button
                            title="Ouvrir la page de connexion"
                            onPress={handleLogin}
                            loading={loading}
                            style={{ backgroundColor: "#0078D4" }}
                            size="large"
                        />

                        {result && (
                            <Typography
                                variant="body1"
                                style={{
                                    color: colors.text,
                                    opacity: 0.5,
                                    textAlign: 'center',
                                    marginTop: 8
                                }}
                            >
                                Statut: {result.type}
                            </Typography>
                        )}
                    </StackLayout>
                </StackLayout>
            </View>

            <OnboardingBackButton />
        </ViewContainer>
    );
}