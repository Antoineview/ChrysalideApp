import { LegendList } from '@legendapp/list';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTheme } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import React from 'react';
import { FlatList, FlatListProps, PressableProps, StyleProp, View, ViewStyle } from 'react-native';

import { runsIOS26 } from '../utils/IsLiquidGlass';
import Icon from './Icon';
import Item, { Leading, Trailing } from './Item';
import List from './List';
import Stack from './Stack';
import Typography from './Typography';

interface SectionItem {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  icon?: React.ReactNode;
  papicon?: React.ReactNode;
  type?: string;
  content?: React.ReactNode;
  title?: string;
  titleProps?: Record<string, unknown>;
  tags?: Array<string>;
  description?: string;
  descriptionProps?: Record<string, unknown>;
  onPress?: () => void;
  hideTitle?: boolean;
  itemProps?: PressableProps;
  ui?: {
    first?: boolean;
    last?: boolean;
    [key: string]: unknown;
  };
}

interface Section {
  title?: string;
  icon?: React.ReactNode;
  papicon?: React.ReactNode;
  hideTitle?: boolean;
  items: Array<SectionItem>;
}

interface TableFlatListProps extends Omit<FlatListProps<Section>, 'data' | 'renderItem'> {
  sections: Array<Section | null>;
  engine?: 'FlatList' | 'LegendList' | 'FlashList';
  contentInsetAdjustmentBehavior?: 'automatic' | 'scrollableAxes' | 'never';
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  listProps?: Record<string, unknown>;
  ignoreHeaderHeight?: boolean;
}

const TableFlatList: React.FC<TableFlatListProps> = ({
  sections,
  engine = 'FlatList',
  contentInsetAdjustmentBehavior = 'never',
  style = {},
  contentContainerStyle = {},
  ignoreHeaderHeight = false,
  ...rest
}) => {
  const theme = useTheme();
  const { colors } = theme;
  const headerHeight = ignoreHeaderHeight ? 0 : useHeaderHeight();

  // Filter out null sections
  const validSections = sections.filter((section): section is Section => section !== null);

  const ListComponent = engine === 'LegendList' ? LegendList : engine === 'FlashList' ? FlashList : FlatList;

  const renderSectionComponent = ({ item: section, index }: { item: Section; index: number }) => (
    <View key={index} style={{ marginBottom: 14 }}>
      {/* Section Title */}
      {section.title && !section.hideTitle && (
        <Stack direction="horizontal" gap={8} vAlign="start" hAlign="center" style={{
          paddingHorizontal: 4,
          paddingVertical: 0,
          marginBottom: 14,
          marginTop: 1,
          opacity: 0.5,
        }}>
          {section.icon || section.papicon ? (
            <Icon size={20} papicon={!!section.papicon}>
              {section.papicon ? section.papicon : section.icon}
            </Icon>
          ) : null}
          <Typography>
            {section.title}
          </Typography>
        </Stack>
      )}

      {/* Section Items - Using the List component */}
      <List>
        {section.items.map((item, itemIndex) => (
          <Item
            key={itemIndex}
            onPress={item.onPress}
            isLast={itemIndex === section.items.length - 1}
            {...item.itemProps}
          >
            {item.leading && (
              <Leading>
                {item.leading}
              </Leading>
            )}
            {(item.icon || item.papicon) && (
              <Icon papicon={!!item.papicon} opacity={0.5}>
                {item.papicon ? item.papicon : item.icon}
              </Icon>
            )}
            {item.title && (
              <Typography variant='title' {...item.titleProps}>
                {item.title}
              </Typography>
            )}
            {item.description && !item.tags && (
              <Typography variant="body2" weight='medium' color="secondary" {...item.descriptionProps}>
                {item.description}
              </Typography>
            )}
            {item.tags && (
              <Stack direction={"horizontal"} gap={6}>
                {item.tags.map((tag: string) => (
                  <Stack direction={"horizontal"} gap={8} hAlign={"center"} radius={100} backgroundColor={colors.background} inline padding={[12, 3]} card flat key={tag}>
                    <Typography variant={"body1"} color="secondary">
                      {tag}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
            {item.content && item.content}
            {item.trailing && (
              <Trailing>
                {item.trailing}
              </Trailing>
            )}
          </Item>
        ))}
      </List>
    </View>
  );

  return (
    <ListComponent
      contentInsetAdjustmentBehavior={ignoreHeaderHeight ? 'never' : contentInsetAdjustmentBehavior}
      style={[{
        flex: 1, height: "100%", width: "100%",
        backgroundColor: colors.background,
        paddingTop: runsIOS26 && contentInsetAdjustmentBehavior !== 'automatic' ? headerHeight : 0
      }, style]}
      data={validSections}
      contentContainerStyle={[{ padding: 16 }, contentContainerStyle]}
      keyExtractor={(_item: Section, index: number) => `section-${index}`}
      renderItem={renderSectionComponent}
      {...rest}
    />
  )
};

export default TableFlatList;