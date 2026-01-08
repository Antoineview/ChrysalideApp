import { useTheme } from "@react-navigation/native";
import { t } from "i18next";
import React, { useEffect } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, View } from "react-native";
import Animated, { useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, WebViewProps } from "react-native-webview";

import OnboardingBackButton from "@/components/onboarding/OnboardingBackButton";
import Stack from "@/ui/components/Stack";
import Typography from "@/ui/components/Typography";
import ViewContainer from "@/ui/components/ViewContainer";

const OnboardingWebview = ({ title, color, step, totalSteps, webviewProps, webViewRef, hideSteps = false }: {
  title: string
  color: string
  step: number
  totalSteps: number
  webviewProps: WebViewProps
  webViewRef?: React.RefObject<WebView<object> | null>
  hideSteps?: boolean
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [totallyLoaded, setTotallyLoaded] = React.useState(false);

  const titleOpacity = useSharedValue(1);
  const compactHeaderHeight = 100 + insets.top;
  const fullHeaderHeight = 150 + insets.top;
  const headerHeight = useSharedValue(hideSteps ? compactHeaderHeight : fullHeaderHeight);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", onKeyboardShow);
    const hideSubscription = Keyboard.addListener("keyboardDidHide", onKeyboardHide);

    const timer = setTimeout(() => {
      setTotallyLoaded(true);
    }, 3000);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      clearTimeout(timer);
    };
  }, []);

  const onKeyboardShow = () => {
    titleOpacity.value = withTiming(0, { duration: 100 });
    headerHeight.value = withSpring(60 + insets.top, { stiffness: 500, damping: 50 });
  };

  const onKeyboardHide = () => {
    titleOpacity.value = withSpring(1, { stiffness: 200, damping: 20 });
    headerHeight.value = withSpring(hideSteps ? compactHeaderHeight : fullHeaderHeight, { stiffness: 500, damping: 50 });
  };

  return (
    <ViewContainer>
      <KeyboardAvoidingView
        style={{ flex: 1, height: '100%' }}
        behavior="padding"
        keyboardVerticalOffset={-insets.top + 20}
      >
        {!hideSteps && (
          <Stack flex
            direction="horizontal"
            height={40}
            style={{ position: "absolute", left: 75, top: insets.top + 7, zIndex: 2 }}
            hAlign={"center"}
          >
            <Typography
              variant="h5"
              style={{ color: "white", lineHeight: 22, fontSize: 18 }}
            >
              {"Étape " + step}
            </Typography>
            <Typography
              variant="h5"
              style={{ color: "#FFFFFF90", lineHeight: 22, fontSize: 18 }}
            >
              {"sur " + totalSteps}
            </Typography>
          </Stack>
        )}
        {hideSteps ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingTop: 16,
              paddingHorizontal: 16,
              paddingBottom: 16,
              backgroundColor: color,
              borderBottomLeftRadius: 42,
              borderBottomRightRadius: 42,
              borderCurve: "continuous",
            }}
          >
            {/* Spacer for back button (10 padding + 26 icon + 10 padding = 46) */}
            <View style={{ width: 46, height: 46 }} />
            <Typography
              variant="h3"
              style={{ color: "#FFFFFF", lineHeight: 28, fontSize: 22, marginLeft: 8 }}
            >
              {title}
            </Typography>
          </View>
        ) : (
          <Animated.View
            style={{
              padding: 32,
              paddingTop: insets.top,
              backgroundColor: color,
              gap: 20,
              alignItems: "center",
              justifyContent: "flex-end",
              borderBottomLeftRadius: 42,
              borderBottomRightRadius: 42,
              paddingBottom: 25,
              borderCurve: "continuous",
              height: headerHeight,
            }}
          >
            <Animated.View style={{ opacity: titleOpacity }}>
              <Typography
                variant="h3"
                style={{ color: "#FFFFFF", lineHeight: 28, fontSize: 28 }}
              >
                {title}
              </Typography>
            </Animated.View>
          </Animated.View>
        )}
        <View
          style={{ flex: 1, padding: 20, paddingBottom: insets.bottom + 20 }}
        >
          <View
            style={{
              width: "100%",
              flex: 1,
              borderWidth: 2,
              borderColor: colors.border,
              backgroundColor: "white",
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              {...webviewProps}
              style={{
                flex: 1,
                opacity: 1,
                backgroundColor: 'white'
              }}
              onLoadEnd={(e) => {
                webviewProps.onLoadEnd?.(e);
                if (e.nativeEvent.url.includes("pronote")) {
                  const source = webviewProps.source as { uri?: string };
                  if (source?.uri && e.nativeEvent.url !== source.uri) {
                    setTotallyLoaded(true);
                  }
                } else {
                  setTotallyLoaded(true);
                }
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                backgroundColor: colors.background,
                opacity: totallyLoaded ? 0 : 1,
                pointerEvents: totallyLoaded ? 'none' : 'auto',
              }}
            >
              <ActivityIndicator size={"large"} />
              <Typography variant={"h3"} align={"center"} color={colors.text + "90"} style={{ marginTop: 10 }}>{t("Webview_Wait")}</Typography>
              <Typography variant={"caption"} align={"center"} color={colors.text + "50"}>{t("Onboarding_Load_Webview_Description")}</Typography>
            </View>
          </View>
        </View>
        <OnboardingBackButton />
      </KeyboardAvoidingView>
    </ViewContainer>
  );
};

export default OnboardingWebview;