import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RobotProvider } from '../src/context/RobotContext';
import { soundService } from '../src/services/soundService';
import { ambientService } from '../src/services/ambientService';
import { THEME } from '../src/utils/theme';

const S = THEME;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type MCIName     = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function HeaderTitle({
  label,
  mci,
  ion,
}: {
  label: string;
  mci?:  MCIName;
  ion?:  IoniconName;
}) {
  return (
    <View style={styles.headerRow}>
      {mci && (
        <MaterialCommunityIcons
          name={mci}
          size={22}
          color={S.colors.primary}
          style={styles.headerIcon}
        />
      )}
      {ion && (
        <Ionicons
          name={ion}
          size={22}
          color={S.colors.primary}
          style={styles.headerIcon}
        />
      )}
      <Text style={styles.headerLabel}>{label}</Text>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    soundService.init();
    ambientService.init();
    return () => {
      soundService.dispose();
      ambientService.dispose();
    };
  }, []);

  return (
    <RobotProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: S.colors.card,
          },
          headerTintColor:     S.colors.primary,
          headerTitleStyle:    { fontWeight: '700', fontSize: 18 },
          headerShadowVisible: false,
          contentStyle:        { backgroundColor: S.colors.background },
          animation:           'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerTitle:       () => <HeaderTitle mci="robot-happy" label="Edubot Connect" />,
            headerBackVisible: false,
          }}
        />

        <Stack.Screen
          name="dashboard"
          options={{
            headerTitle:       () => <HeaderTitle ion="home" label="Dashboard" />,
            headerBackVisible: false,
          }}
        />

        <Stack.Screen
          name="control"
          options={{
            headerTitle:     () => <HeaderTitle mci="gamepad" label="Robot Control" />,
            headerStyle:     { backgroundColor: '#0F172A' },
            headerTintColor: S.colors.primary,
          }}
        />

        <Stack.Screen
          name="faces"
          options={{
            headerTitle: () => <HeaderTitle mci="emoticon-happy-outline" label="Robot Faces" />,
          }}
        />

        <Stack.Screen
          name="heart-display"
          options={{
            headerTitle: () => <HeaderTitle ion="heart" label="Heart Display" />,
          }}
        />

        <Stack.Screen
          name="sports-mode"
          options={{
            headerTitle:     () => <HeaderTitle mci="racing-helmet" label="Sports Mode" />,
            headerStyle:     { backgroundColor: '#0D1117' },
            headerTintColor: '#FFD700',
          }}
        />

        <Stack.Screen
          name="coding"
          options={{
            headerTitle: () => <HeaderTitle ion="code-slash" label="Simple Coding" />,
          }}
        />

        <Stack.Screen
          name="progress"
          options={{
            headerTitle: () => <HeaderTitle ion="star" label="My Progress" />,
          }}
        />

        <Stack.Screen
          name="learning"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="robot-game"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="adventure-map"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="level-complete"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="robot-customization"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="mission-mode"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="voice-command"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="settings"
          options={{
            headerTitle: () => <HeaderTitle ion="settings-sharp" label="Settings" />,
          }}
        />

        <Stack.Screen
          name="servo-control"
          options={{
            headerTitle: () => <HeaderTitle ion="hardware-chip-outline" label="Servo Control" />,
          }}
        />
      </Stack>
    </RobotProvider>
  );
}

const styles = StyleSheet.create({
  headerRow:  { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { marginRight: 7 },
  headerLabel: {
    color:      S.colors.text,
    fontSize:   18,
    fontWeight: '700',
  },
});
