import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRobot, type ConversationEntry } from '../src/context/RobotContext';
import { THEME } from '../src/utils/theme';
import AnimatedBackground from '../src/components/ui/AnimatedBackground';
import KidButton from '../src/components/ui/KidButton';

const S = THEME;

function ChatBubble({ entry }: { entry: ConversationEntry }) {
  const isRobot = entry.role === 'robot';
  return (
    <View style={[styles.bubbleWrap, isRobot ? styles.robotWrap : styles.userWrap]}>
      {isRobot && (
        <View style={styles.avatar}>
          <Ionicons name="hardware-chip" size={18} color="#fff" />
        </View>
      )}
      <View style={[styles.bubble, isRobot ? styles.robotBubble : styles.userBubble]}>
        <Text style={[styles.bubbleText, isRobot ? styles.robotText : styles.userText]}>
          {entry.text}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {!isRobot && (
        <View style={[styles.avatar, { backgroundColor: S.colors.secondary }]}>
          <Ionicons name="person" size={18} color="#fff" />
        </View>
      )}
    </View>
  );
}

export default function ConversationScreen() {
  const { conversation, clearConversation, requestVoice, isConnected, robotStatus } = useRobot();
  const listRef = useRef<FlatList>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (conversation.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [conversation.length]);

  const robotState = robotStatus?.state ?? 'UNKNOWN';
  const isListening = robotState === 'LISTENING';
  const isThinking  = robotState === 'THINKING';
  const isSpeaking  = robotState === 'SPEAKING';

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="chatbubbles" size={26} color={S.colors.primary} />
          <Text style={styles.title}>Conversation</Text>
        </View>
        <View style={styles.headerRight}>
          {isConnected && (
            <View style={[styles.stateBadge, stateColor(robotState)]}>
              <Text style={styles.stateText}>{robotState}</Text>
            </View>
          )}
          <TouchableOpacity onPress={clearConversation} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={20} color={S.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat list */}
      {conversation.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubble-ellipses-outline" size={64} color={S.colors.border} />
          <Text style={styles.emptyTitle}>No conversation yet</Text>
          <Text style={styles.emptyHint}>
            Press the button on your robot or tap Speak below to start talking!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={conversation}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ChatBubble entry={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Footer controls */}
      <View style={styles.footer}>
        {(isListening || isThinking || isSpeaking) ? (
          <View style={styles.statusRow}>
            <Ionicons
              name={isListening ? 'mic' : isThinking ? 'bulb' : 'volume-high'}
              size={22}
              color={S.colors.primary}
            />
            <Text style={styles.statusLabel}>
              {isListening ? 'Robot is listening...'
                : isThinking ? 'Robot is thinking...'
                : 'Robot is speaking...'}
            </Text>
          </View>
        ) : (
          <KidButton
            label="Speak to Robot"
            onPress={() => router.push('/voice-command')}
            icon={<Ionicons name="mic" size={22} color="#fff" />}
            fullWidth
            disabled={!isConnected}
            size="lg"
          />
        )}
      </View>
    </View>
  );
}

function stateColor(state: string): object {
  switch (state) {
    case 'LISTENING': return { backgroundColor: '#22c55e' };
    case 'THINKING':  return { backgroundColor: '#f59e0b' };
    case 'SPEAKING':  return { backgroundColor: '#06b6d4' };
    case 'ERROR':     return { backgroundColor: '#ef4444' };
    default:          return { backgroundColor: S.colors.textMuted };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: S.colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S.spacing.lg, paddingTop: S.spacing.lg, paddingBottom: S.spacing.md,
    backgroundColor: S.colors.card, ...S.shadow.sm,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: S.spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: S.spacing.sm },
  title:       { fontSize: S.fontSize.xl, fontWeight: '800', color: S.colors.text },

  stateBadge: { borderRadius: S.radius.full, paddingHorizontal: S.spacing.sm, paddingVertical: 3 },
  stateText:  { fontSize: 11, fontWeight: '700', color: '#fff' },
  clearBtn:   { padding: S.spacing.sm },

  list: { padding: S.spacing.lg, paddingBottom: S.spacing.sm },

  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: S.spacing.md },
  robotWrap:  { justifyContent: 'flex-start' },
  userWrap:   { justifyContent: 'flex-end' },

  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: S.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  bubble: { maxWidth: '75%', borderRadius: S.radius.lg, padding: S.spacing.md },
  robotBubble: {
    backgroundColor: S.colors.card, borderBottomLeftRadius: 4,
    ...S.shadow.sm,
  },
  userBubble: {
    backgroundColor: S.colors.primary, borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: S.fontSize.md, lineHeight: 22 },
  robotText:  { color: S.colors.text },
  userText:   { color: '#fff' },
  timestamp:  { fontSize: 10, color: S.colors.textMuted, marginTop: 4 },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: S.spacing.xxl,
  },
  emptyTitle: { fontSize: S.fontSize.xl, fontWeight: '700', color: S.colors.textMuted, marginTop: S.spacing.lg },
  emptyHint:  { fontSize: S.fontSize.md, color: S.colors.textLight, textAlign: 'center', marginTop: S.spacing.sm, lineHeight: 22 },

  footer: { padding: S.spacing.lg, paddingBottom: S.spacing.xl, backgroundColor: S.colors.card },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: S.spacing.sm, justifyContent: 'center', paddingVertical: S.spacing.sm },
  statusLabel: { fontSize: S.fontSize.md, fontWeight: '600', color: S.colors.primary },
});
