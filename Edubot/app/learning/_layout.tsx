/**
 * app/learning/_layout.tsx
 * Stack layout for the Learning section — all game screens live here.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type MCIName     = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function HeaderTitle({ label, mci, ion }: { label: string; mci?: MCIName; ion?: IoniconName }) {
  return (
    <View style={styles.headerRow}>
      {mci && <MaterialCommunityIcons name={mci} size={24} color="#fff" style={styles.icon} />}
      {ion && <Ionicons name={ion} size={24} color="#fff" style={styles.icon} />}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  icon:      { marginRight: 8 },
  label:     { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});

export default function LearningLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle:      { backgroundColor: '#6C63FF' },
        headerTintColor:  '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
        contentStyle:     { backgroundColor: '#F5F5F5' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => (
            <HeaderTitle ion="book-outline" label="Learning Activities" />
          ),
        }}
      />
      <Stack.Screen
        name="colors"
        options={{
          headerTitle: () => (
            <HeaderTitle mci="palette" label="Color Learning" />
          ),
        }}
      />
      <Stack.Screen
        name="numbers"
        options={{
          headerTitle: () => (
            <HeaderTitle mci="numeric" label="Number Learning" />
          ),
        }}
      />
      <Stack.Screen
        name="shapes"
        options={{
          headerTitle: () => (
            <HeaderTitle mci="shape" label="Shape Learning" />
          ),
        }}
      />
    </Stack>
  );
}
