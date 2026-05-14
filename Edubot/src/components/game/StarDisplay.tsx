import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarDisplayProps {
  earned:  number;
  size?:   number;
  style?:  ViewStyle;
}

export default function StarDisplay({ earned, size = 28, style }: StarDisplayProps) {
  const filled = Math.max(0, Math.min(3, Math.round(earned)));

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {[0, 1, 2].map(i => (
        <Ionicons
          key={i}
          name={i < filled ? 'star' : 'star-outline'}
          size={size}
          color={i < filled ? '#FFD700' : 'rgba(255,215,0,0.35)'}
          style={{ marginHorizontal: 2 }}
        />
      ))}
    </View>
  );
}
