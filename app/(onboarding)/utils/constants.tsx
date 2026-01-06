/* eslint-disable @typescript-eslint/no-require-imports */
import { useTheme } from '@react-navigation/native';
import { UnknownInputParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleProp, ViewStyle } from 'react-native';

import { Services } from '@/stores/account/types';
export interface SupportedService {
  name: string;
  title: string;
  type: string;
  image?: NodeRequire;
  onPress: () => void;
  variant: string;
  color?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function GetSupportedServices(redirect: (path: { pathname: string, options?: UnknownInputParams }) => void): SupportedService[] {
  const theme = useTheme();
  const { colors } = theme;
  const { t } = useTranslation()

  return [
    {
      name: "university",
      title: "Microsoft (EPITA)",
      type: "other",
      image: require("@/assets/images/auriga.png"),
      onPress: () => {
        redirect({ pathname: '../university/multi/aurigaAuth', options: { color: "#0060D6", university: "Microsoft (EPITA)", url: "https://ionisepita-auth.np-auriga.nfrance.net/auth/realms/npionisepita/protocol/openid-connect/auth?client_id=np-front&redirect_uri=https%3A%2F%2Fauriga.epita.fr%2F%23%2FmainContent%2Fwelcome&state=b0d51531-8196-40d8-879a-65006e6a077c&response_mode=fragment&response_type=code&scope=openid&nonce=76fd097a-cf70-4f89-8a38-2f7e80b77475&prompt=login&code_challenge=8AH2655_0ZuKl4XeB_TOu0Jbr1HJQoJdPTzG_Rf4Yig&code_challenge_method=S256" } });
      },
      variant: 'primary' as const,
      style: { backgroundColor: theme.dark ? colors.border : "black" },
    },
    {
      name: "izly",
      title: "Izly",
      type: "other",
      image: require("@/assets/images/izly.png"),
      onPress: () => {
        redirect({ pathname: '../izly/credentials' });
      },
      variant: 'primary' as const,
      style: { backgroundColor: theme.dark ? colors.border : "black" },
    }
  ]
}

export interface SupportedUniversity {
  name: string;
  title: string;
  hasLimitedSupport: boolean;
  image?: NodeRequire;
  type: string;
  onPress: () => void;
}

export function GetSupportedUniversities(redirect: (path: { pathname: string, options?: UnknownInputParams }) => void): SupportedUniversity[] {
  const { t } = useTranslation();

  return [
    {
      name: "univ-lorraine",
      title: "Université de Lorraine",
      hasLimitedSupport: false,
      image: require("@/assets/images/univ_lorraine.png"),
      type: "main",
      onPress: () => {
        redirect({ pathname: './multi/credentials', options: { color: "#000000", university: "ULorraine", url: "https://mobile-back.univ-lorraine.fr" } });
      },
    },
    {
      name: "univ-nimes",
      title: "Université de Nîmes",
      hasLimitedSupport: false,
      image: require("@/assets/images/univ_nimes.png"),
      type: "main",
      onPress: () => {
        redirect({ pathname: './multi/credentials', options: { color: "#FF341B", university: "UNîmes", url: "https://mobile-back.unimes.fr" } });
      },
    },
    {
      name: "univ-uphf",
      title: "Université Polytechnique Hauts-de-France",
      hasLimitedSupport: false,
      image: require("@/assets/images/univ_uphf.png"),
      type: "main",
      onPress: () => {
        redirect({ pathname: './multi/credentials', options: { color: "#008DB0", university: "UPHF", url: "https://appmob.uphf.fr/backend" } });
      },
    },
    {
      name: "iut-lannion",
      title: "IUT de Lannion",
      hasLimitedSupport: false,
      image: require("@/assets/images/univ_lannion.png"),
      type: "main",
      onPress: () => {
        redirect({ pathname: './lannion/credentials' });
      },
    },
    {
      name: "appscho",
      title: "Autres universités",
      hasLimitedSupport: false,
      type: "other",
      onPress: () => { redirect({ pathname: './appscho/list' }) }
    },

    /*{
      name: "limited-functions",
      title: t("Feature_Limited"),
      hasLimitedSupport: true,
      image: require("@/assets/images/univ_lannion.png"),
      type: "separator",
      onPress: () => { }
    },
    {
      name: "univ-rennes-1",
      title: "Université de Rennes 1",
      hasLimitedSupport: true,
      image: require("@/assets/images/univ_rennes1.png"),
      type: "main",
      onPress: () => { }
    },
    {
      name: "univ-rennes-2",
      title: "Université de Rennes 2",
      hasLimitedSupport: true,
      image: require("@/assets/images/univ_rennes2.png"),
      type: "main",
      onPress: () => { }
    },
    {
      name: "univ-limoges",
      title: "Université de Limoges",
      type: "main",
      hasLimitedSupport: true,
      image: require("@/assets/images/univ_limoges.png"),
      onPress: () => { }
    },
    {
      name: "univ_paris_sorbonne",
      title: "Université de Sorbonne Paris Nord",
      hasLimitedSupport: true,
      image: require("@/assets/images/univ_paris_sorbonne.png"),
      type: "main",
      onPress: () => { }
    } */
  ]
}

export interface LoginMethod {
  id: string,
  availableFor: Array<Services>,
  description: string,
  icon: React.ReactNode,
  onPress: () => void;
}

/*export function GetLoginMethods(redirect: (path: { pathname: RelativePathString }) => void): LoginMethod[] {
  const { t } = useTranslation();

  return [
    {
      id: "map",
      availableFor: [Services.PRONOTE, Services.SKOLENGO],
      description: t("ONBOARDING_METHOD_POSITION"),
      icon: <Papicons name={"MapPin"} />,
      onPress: async () => {
        redirect({ pathname: './map' });
      }
    },
    {
      id: "search",
      availableFor: [Services.PRONOTE, Services.SKOLENGO],
      description: t("ONBOARDING_METHOD_SEARCH"),
      icon: <Papicons name={"Search"} />,
      onPress: () => {
        redirect({ pathname: './search' })
      }
    },
    {
      id: "qrcode",
      availableFor: [Services.PRONOTE],
      description: t("ONBOARDING_METHOD_QRCODE"),
      icon: <Papicons name={"QrCode"} />,
      onPress: () => {
        redirect({ pathname: "/(onboarding)/pronote/qrcode" });
      }
    },
    {
      id: "url",
      availableFor: [Services.PRONOTE],
      description: t("ONBOARDING_METHOD_LINK"),
      icon: <Papicons name={"Link"} />,
      onPress: () => {
        redirect({ pathname: '../pronote/url' });
      }
    }
  ]
}
*/