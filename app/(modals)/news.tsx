import { Papicons } from "@getpapillon/papicons";
import { useTheme } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, View } from "react-native";
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from "react-native-safe-area-context";

import OnboardingBackButton from "@/components/onboarding/OnboardingBackButton";
import AnimatedPressable from '@/ui/components/AnimatedPressable';
import StackLayout from "@/ui/components/Stack";
import Typography from "@/ui/components/Typography";
import ViewContainer from "@/ui/components/ViewContainer";

import { GetNewsServices, NewsService } from "../(onboarding)/utils/constants";
import { isIntracomConnected, resetIntracomToken } from "./login-intracom";

export default function NewsModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { colors } = theme;
    const [updateKey, setUpdateKey] = useState(0);
    const newsServices = GetNewsServices((path: { pathname: string, options?: any }) => {
        router.push({ pathname: path.pathname as any, params: path.options ?? {}, });
    });

    return (
        <><ViewContainer>
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
                            Actualités
                        </Typography>
                        <Typography variant="h5" style={{ color: "#FFFFFF", lineHeight: 22, fontSize: 18 }}>
                            Sélectionne ta source d'actualités
                        </Typography>
                    </StackLayout>
                </StackLayout>

                <View style={{ flex: 1, padding: 20, paddingBottom: insets.bottom + 20 }}>
                    {newsServices.map((item: NewsService, index: number) => (
                        <Reanimated.View
                            key={item.name}
                            entering={FadeInDown.springify().duration(400).delay(index * 80 + 150)}
                            style={{ marginBottom: 16 }}
                        >
                            <AnimatedPressable
                                onPress={() => {
                                    if (item.name === 'intracom' && isIntracomConnected()) {
                                        resetIntracomToken();
                                        setUpdateKey(k => k + 1);
                                        router.back();
                                    } else {
                                        requestAnimationFrame(() => {
                                            item.onPress();
                                        });
                                    }
                                }}
                            >
                                <View
                                    style={{
                                        paddingHorizontal: 18,
                                        paddingVertical: 14,
                                        backgroundColor: '#0078D4',
                                        borderColor: '#0078D4',
                                        borderWidth: 1.5,
                                        borderRadius: 80,
                                        borderCurve: "continuous",
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        display: 'flex',
                                        gap: 16,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                                            <Image
                                                source={{ uri: item.image.uri }}
                                                style={{ width: 32, height: 32, borderRadius: 20, backgroundColor: '#0078D4' }}
                                                resizeMode="cover"
                                                onError={e => console.warn("Erreur chargement image", e.nativeEvent)} />
                                        </View>
                                        <Typography style={{ flex: 1, color: 'white', marginLeft: 12 }} nowrap variant='title'>
                                            {item.title}
                                        </Typography>
                                        {item.name === 'intracom' && isIntracomConnected() && (
                                            <View
                                                style={{
                                                    marginLeft: 8,
                                                    padding: 6,
                                                    borderRadius: 16,
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Papicons name="logout" size={24} color="white" />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </AnimatedPressable>
                        </Reanimated.View>
                    ))}
                </View>
            </View><OnboardingBackButton />
        </ViewContainer></>
    );
}