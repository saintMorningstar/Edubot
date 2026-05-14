

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../utils/constants';

interface BlockItemProps {
  block: {
    id:       string;
    label:    string;
    iconName: string;   
    color:    string;
  };
  index:      number;
  isActive:   boolean;
  isLast:     boolean;
  onRemove:   () => void;
  onMoveUp:   () => void;
  onMoveDown: () => void;
}

export default function BlockItem({
  block,
  index,
  isActive,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown,
}: BlockItemProps) {
  return (
    <View
      style={[
        styles.container,
        { borderLeftColor: block.color },
        isActive && styles.activeContainer,
      ]}
    >
     
      <Text style={styles.number}>{index + 1}</Text>

     
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name={block.iconName as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
          size={28}
          color={block.color}
        />
      </View>

      
      <Text style={styles.label}>{block.label}</Text>

      
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={onMoveUp}
          disabled={index === 0}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-up"
            size={22}
            color={index === 0 ? '#E0E0E0' : COLORS.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onMoveDown}
          disabled={isLast}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-down"
            size={22}
            color={isLast ? '#E0E0E0' : COLORS.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRemove}
          style={styles.removeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: COLORS.white,
    borderRadius:    BORDER_RADIUS.medium,
    padding:         SPACING.md,
    marginBottom:    SPACING.sm,
    borderLeftWidth: 6,
    elevation:       2,
    shadowColor:     COLORS.black,
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.1,
    shadowRadius:    2,
  },
  activeContainer: {
    backgroundColor: '#FFF9C4',
  },
  number: {
    fontSize:   FONT_SIZES.medium,
    fontWeight: 'bold',
    color:      COLORS.textLight,
    width:      22,
  },
  iconWrap: {
    marginHorizontal: SPACING.sm,
  },
  label: {
    flex:       1,
    fontSize:   FONT_SIZES.medium,
    fontWeight: 'bold',
    color:      COLORS.text,
  },
  controls: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.xs,
  },
  removeBtn: {
    marginLeft: SPACING.xs,
  },
});
