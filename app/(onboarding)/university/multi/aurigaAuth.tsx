import React, { useState, useEffect } from 'react';
import { Button, View, StyleSheet, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAlert } from "@/ui/components/AlertProvider";
import { useNavigation } from 'expo-router';

// Indispensable pour que le résultat revienne sur Android
WebBrowser.maybeCompleteAuthSession();

export default function AurigaLoginScreen() {
    const [result, setResult] = useState<any>(null);
    const alert = useAlert();
    const router = useNavigation();

    // 1. Ton URL de login originale
    const LOGIN_URL = "https://login.microsoftonline.com/3534b3d7-316c-4bc9-9ede-605c860f49d2/oauth2/v2.0/authorize?scope=openid+profile+email&state=CHg61gg5BomQGCi943xDz_K_Y4M-AWFPkDV_aEryzFk.vdI9jwfruJg.2dqw7iD6R4OVLsJiv__8Ig&response_type=code&client_id=5ba7da34-9df6-4a44-9042-82ac5b04b9fb&redirect_uri=https%3A%2F%2Fionisepita-auth.np-auriga.nfrance.net%2Fauth%2Frealms%2Fnpionisepita%2Fbroker%2Foidc%2Fendpoint&prompt=login&nonce=nQVgSoYOo8Svwi6B5enHsA";

    const _handlePressButtonAsync = async () => {
        try {
            // Ouvre le navigateur système (Chrome Custom Tab)
            // C'est ici que la magie opère : ça utilise les cookies/sessions de Chrome
            let result = await WebBrowser.openAuthSessionAsync(
                LOGIN_URL,
                // Idéalement, la redirect_uri devrait être ceci pour revenir à l'app :
                // Linking.createURL('/') 
                // Mais comme tu utilises une URL fixe (ionisepita...), on laisse null ou l'URL par défaut.
                null
            );

            setResult(result);
            console.log("Résultat du navigateur :", result);

            // GESTION DU RETOUR
            if (result.type === 'success' && result.url) {
                // L'utilisateur est revenu sur l'application !
                // L'URL contient souvent le code ou le token : result.url

                alert.showAlert({
                    title: "Connexion réussie",
                    description: "Retour à l'application validé.",
                    icon: "Check",
                    color: "#00D600"
                });

                // Redirection vers l'accueil
                // router.replace('/(tabs)/index');
            }
            else if (result.type === 'cancel') {
                console.log("L'utilisateur a fermé la fenêtre sans se connecter.");
            }
        } catch (error) {
            console.error("Erreur WebBrowser:", error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Connexion via Microsoft</Text>
            <Button title="Ouvrir la page de connexion" onPress={_handlePressButtonAsync} />

            {result && (
                <Text style={styles.logText}>Statut: {result.type}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    text: {
        fontSize: 20,
        marginBottom: 20,
        fontWeight: 'bold'
    },
    logText: {
        marginTop: 20,
        color: 'gray'
    }
});