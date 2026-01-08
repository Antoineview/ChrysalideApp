import { Papicons } from "@getpapillon/papicons";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableNativeFeedback, View } from "react-native";

import Icon from "@/ui/components/Icon";

const AndroidBackButton = () => {
  const router = useRouter();

  return (
    <TouchableNativeFeedback
      onPress={() => router.back()}
      useForeground
    >
      <View
        style={{
          width: 42,
          height: 42,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
          marginRight: 12,
          marginLeft: -6,
          marginBottom: -3,
          overflow: "hidden",
        }}
      >
        <Icon size={26}>
          <Papicons name="arrowleft" />
        </Icon>
      </View>
    </TouchableNativeFeedback>
  );
};

export default AndroidBackButton;
