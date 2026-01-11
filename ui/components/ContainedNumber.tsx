import React from 'react';
import { View } from 'react-native';

import Typography from './Typography';

interface ContainedNumberProps {
  children?: React.ReactNode;
  denominator?: string;
  color?: string;
}

const ContainedNumber: React.FC<ContainedNumberProps> = ({ denominator, color, children }) => {
  return (
    <View
      style={{
        backgroundColor: color + '26',
        borderRadius: 80,
        borderCurve: 'continuous',
        paddingHorizontal: 10,
        paddingVertical: 1,
        gap: 2,
        flexDirection: 'row',
        alignItems: 'baseline',
        borderColor: color + '46',
        borderWidth: 0,
        minWidth: 50,
        justifyContent: "center"
      }}
    >
      {(children !== undefined && children !== null) && (
        <Typography variant='title' style={{ fontSize: 18, lineHeight: 32 }} color={color}>
          {children}
        </Typography>
      )}
      {denominator && (
        <Typography variant='body2' color={color + "a6"}>
          {denominator}
        </Typography>
      )}
    </View>
  );
};

export default ContainedNumber;
