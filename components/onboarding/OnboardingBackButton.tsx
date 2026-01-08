import { Papicons } from "@getpapillon/papicons";
import { useRouter } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AnimatedPressable from "@/ui/components/AnimatedPressable";

const OnboardingBackButton = (props: {
  icon?: string;
  position?: 'left' | 'right';
  isModal?: boolean;
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <AnimatedPressable
      onPress={() => router.back()}
      style={[
        {
          position: 'absolute',
          top: props.isModal ? 20 : insets.top + 4,
          zIndex: 200,
          backgroundColor: '#ffffff42',
          padding: 10,
          borderRadius: 100,
        },
        props.position === 'right' ? { right: 16 } : { left: 16 }
      ]}
    >
      <Papicons name={props.icon ?? "ArrowLeft"} size={26} fill={"#fff"} />
    </AnimatedPressable>
  )
}

export default OnboardingBackButton;