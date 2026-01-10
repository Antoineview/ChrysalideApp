import { Papicons } from "@getpapillon/papicons";
import { useTheme } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Linking, ScrollView } from "react-native";

import SettingsHeader from "@/components/SettingsHeader";
import packageJson from "@/package.json"
import Avatar from "@/ui/components/Avatar";
import Icon from "@/ui/components/Icon";
import Item, { Leading, Trailing } from "@/ui/components/Item";
import List from "@/ui/components/List";
import Typography from "@/ui/components/Typography";
import { getInitials } from "@/utils/chats/initials";
import { Contributor, getContributors } from "@/utils/github/contributors";

export const Teams = [
  {
    title: "Antoine RC",
    description: "Développeur",
    login: "Antoine",
    leading: <Avatar size={40} shape="square" initials={getInitials("Vince Linise")} imageUrl="https://media.licdn.com/dms/image/v2/D4E03AQF_QQpb5OX-Wg/profile-displayphoto-crop_800_800/B4EZkJXV6.GYAI-/0/1756798739042?e=1769644800&v=beta&t=U-qVlFwiqRKVjl6vndlU5uVryLEpsM9IIIg7rCN5lM8" />,
    onPress: () => Linking.openURL("https://www.linkedin.com/in/antoine-rc/")
  },
  {
    title: "Gaël B",
    description: "Développeur",
    login: "YouLLox",
    leading: <Avatar size={40} shape="square" initials={getInitials("Lucas Lavajo")} imageUrl="https://media.licdn.com/dms/image/v2/D4D03AQG1qDz75eC30w/profile-displayphoto-crop_800_800/B4DZkJgagsG8AY-/0/1756801116767?e=1769644800&v=beta&t=jhTQIOEY9vh-nFjaO9AqnUi0___OPm-om5HqDGBYZlU" />,
    onPress: () => Linking.openURL("https://www.linkedin.com/in/ga%C3%ABl-benmahieddine/")
  },
  {
    title: "Maxime H",
    description: "Développeur",
    login: "Maxime",
    leading: <Avatar size={40} shape="square" initials={getInitials("Raphaël Schröder")} imageUrl="https://media.licdn.com/dms/image/v2/D4D03AQEvgVA35d_Sgg/profile-displayphoto-shrink_800_800/B4DZdGNzLLHkAg-/0/1749229713281?e=1769644800&v=beta&t=TRRtpEmyAnYpwYa9fq3sN8WvInogyu297RAFC54JbHg" />,
    onPress: () => Linking.openURL("https://www.linkedin.com/in/icimaxhwl/")
  },
  {
    title: "Equipe Papillon",
    description: "",
    login: "",
    leading: <Avatar size={40} shape="square" initials={getInitials("Lucas Lavajo")} imageUrl="https://play-lh.googleusercontent.com/wpV-VScxugHvexfYPURrkhpCxr1un_eJupTk9rHFf9TKfCBlYcrPoqyaJCVtWlX4Zw" />,
    onPress: () => Linking.openURL("https://papillon.bzh/")
  }
]

import { useSettingsStore } from "@/stores/settings";

export default function SettingsAbout() {
  const theme = useTheme()
  const { colors } = theme

  const { t } = useTranslation();
  const settingsStore = useSettingsStore(state => state.personalization);
  const mutateProperty = useSettingsStore(state => state.mutateProperty);

  const [contributors, setContributors] = useState<Contributor[]>([])
  const fetchContributors = async () => {
    const fethedContributors = (await getContributors()).filter(contrib => !Teams.map(item => item.login).includes(contrib.login))
    setContributors(fethedContributors)
  }

  useEffect(() => {
    fetchContributors()
  }, [])

  const Items = [
    {
      title: t("Settings_Donator"),
      description: t("Settings_Donator_Description"),
      leading: <Papicons name="PiggyBank" />,
      onPress: () => Linking.openURL('https://ko-fi.com/thepapillonapp/leaderboard'),
    },
    {
      title: t("Settings_About_Discord"),
      description: t("Settings_About_Discord_Description"),
      leading: <Papicons name="TextBubble" />,
      onPress: () => Linking.openURL('https://discord.gg/6Nqnbamze7'),
    },
    /*{
      title: t("Settings_About_Github"),
    description: t("Settings_About_Github_Description"),
    leading: <Papicons name="Ghost" />,
    onPress: () => Linking.openURL('https://github.com/PapillonApp/Papillon'),
    },*/
  ];

  const [tapCount, setTapCount] = React.useState(0);

  const handleVersionTap = () => {
    setTapCount(prev => prev + 1);
    if (tapCount + 1 >= 8) {
      setTapCount(0);
      if (settingsStore.showDevMode) {
        Alert.alert("Dev Mode", "Dev mode désactivé!");
        mutateProperty("personalization", { showDevMode: false });
      } else {
        Alert.alert("Dev Mode", "Dev mode activé!");
        mutateProperty("personalization", { showDevMode: true });
      }
    }
  };

  const Infos = [
    {
      title: t("Settings_App_Version"),
      description: packageJson.version,
      leading: <Papicons name="Butterfly" />,
      onPress: handleVersionTap,
    },
    {
      title: t("Settings_About_Dependency_Version"),
      description: `Expo: ${packageJson.dependencies?.expo || "N/A"} | RN: ${packageJson.dependencies?.["react-native"] || "N/A"}`,
      leading: <Papicons name="Code" />,
    }
  ];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, gap: 20 }}
      contentInsetAdjustmentBehavior="always"
    >
      <SettingsHeader
        color={theme.dark ? "#121e2a" : "#dfebf7"}
        title={t('Settings_About_Papillion_Behind')}
        description={t('Settings_About_Papillion_Behind_Description')}
        imageSource={require("@/assets/images/about_papillon.png")}
        disableMargin
        height={270}
      />
      <List>
        {Teams.map((item, index) => (
          <Item
            key={index}
            onPress={item.onPress}
          >
            <Leading>
              <Icon>
                {item.leading}
              </Icon>
            </Leading>
            <Typography variant="title">
              {item.title}
            </Typography>
            <Typography variant="caption" color="secondary">
              {item.description}
            </Typography>
            <Trailing>
              <Icon>
                <Papicons name="ChevronRight" />
              </Icon>
            </Trailing>
          </Item>
        ))}
      </List>
      <List>
        {Items.map((item, index) => (
          <Item
            key={index}
            onPress={item.onPress}
          >
            <Leading>
              <Icon>
                {item.leading}
              </Icon>
            </Leading>
            <Typography variant="title">
              {item.title}
            </Typography>
            <Typography variant="caption" color="secondary">
              {item.description}
            </Typography>
            <Trailing>
              <Icon>
                <Papicons name="ChevronRight" />
              </Icon>
            </Trailing>
          </Item>
        ))}
      </List>
      <List>
        {contributors.map(item => (
          <Item key={item.login} onPress={() => Linking.openURL(item.html_url)}>
            <Leading>
              <Avatar size={40} shape="square" initials={getInitials(item.login)} imageUrl={item.avatar_url} />
            </Leading>
            <Typography>{item.login}</Typography>
            <Typography color="secondary">{item.contributions} contributions</Typography>
          </Item>
        ))}
      </List>
      <List>
        {Infos.map((item, index) => (
          <Item
            key={index}
            onPress={item.onPress}
          >
            <Leading>
              <Icon>
                {item.leading}
              </Icon>
            </Leading>
            <Typography variant="title">
              {item.title}
            </Typography>
            <Typography variant="caption" color="secondary">
              {item.description}
            </Typography>
          </Item>
        ))}
      </List>
    </ScrollView>
  );
}
