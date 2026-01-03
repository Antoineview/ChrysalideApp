import { SplashScreen } from "expo-router";
import { useEffect } from "react";

// Splash screen completely removed - just hide the native one immediately
const FakeSplash = ({ isAppReady }: { isAppReady: boolean }) => {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return null;
};

export default FakeSplash;