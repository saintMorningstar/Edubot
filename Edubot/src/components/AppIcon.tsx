

import React from 'react';
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';

export type IconFamily =
  | 'Ionicons'
  | 'MaterialCommunityIcons'
  | 'MaterialIcons';

interface AppIconProps {
  family: IconFamily;
  name:   string;
  size:   number;
  color:  string;
}

export default function AppIcon({ family, name, size, color }: AppIconProps) {
  switch (family) {
    case 'MaterialCommunityIcons':
      return (
        <MaterialCommunityIcons
          name={name as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
          size={size}
          color={color}
        />
      );
    case 'MaterialIcons':
      return (
        <MaterialIcons
          name={name as React.ComponentProps<typeof MaterialIcons>['name']}
          size={size}
          color={color}
        />
      );
    default: 
      return (
        <Ionicons
          name={name as React.ComponentProps<typeof Ionicons>['name']}
          size={size}
          color={color}
        />
      );
  }
}
