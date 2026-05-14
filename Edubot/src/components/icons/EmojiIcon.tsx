import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const MAP: Record<string, { lib: 'ion' | 'mci'; name: string; color: string }> = {
  '⭐':  { lib: 'ion', name: 'star',                   color: '#FFD700' },
  '☆':   { lib: 'ion', name: 'star-outline',           color: '#FFD700' },
  '🌟':  { lib: 'ion', name: 'star',                   color: '#FFEE58' },
  '🚀':  { lib: 'mci', name: 'rocket-launch',          color: '#6C63FF' },
  '🎉':  { lib: 'mci', name: 'party-popper',           color: '#FF6B6B' },
  '🎊':  { lib: 'mci', name: 'party-popper',           color: '#FFD93D' },
  '❤️':  { lib: 'ion', name: 'heart',                  color: '#E91E63' },
  '🌈':  { lib: 'mci', name: 'rainbow',                color: '#9C27B0' },
  '🎮':  { lib: 'mci', name: 'gamepad-variant',        color: '#FF9800' },
  '✨':  { lib: 'mci', name: 'auto-fix',               color: '#FFD700' },
  '🔒':  { lib: 'ion', name: 'lock-closed',            color: '#607D8B' },
  '🎨':  { lib: 'mci', name: 'palette',                color: '#9C27B0' },
  '🏆':  { lib: 'mci', name: 'trophy',                 color: '#FFD700' },
  '🐢':  { lib: 'mci', name: 'tortoise',               color: '#4CAF50' },
  '🏎️':  { lib: 'mci', name: 'car-sports',             color: '#FF9800' },
  '🟢':  { lib: 'ion', name: 'ellipse',                color: '#4CAF50' },
  '🔴':  { lib: 'ion', name: 'ellipse',                color: '#F44336' },
  '⚪':  { lib: 'ion', name: 'ellipse-outline',        color: '#9E9E9E' },
  '🔨':  { lib: 'mci', name: 'hammer',                 color: '#795548' },
  '⬆️':  { lib: 'ion', name: 'arrow-up',               color: '#fff'    },
  '⬇️':  { lib: 'ion', name: 'arrow-down',             color: '#fff'    },
  '⬅️':  { lib: 'ion', name: 'arrow-back',             color: '#fff'    },
  '➡️':  { lib: 'ion', name: 'arrow-forward',          color: '#fff'    },
  '⏹':   { lib: 'ion', name: 'stop',                   color: '#fff'    },
  '🏁':  { lib: 'mci', name: 'flag-checkered',         color: '#1A2340' },
  '🚧':  { lib: 'mci', name: 'alert-octagon-outline',  color: '#FF6B35' },
  '🤔':  { lib: 'mci', name: 'head-question-outline',  color: '#9C27B0' },
  '😊':  { lib: 'mci', name: 'emoticon-happy-outline', color: '#FFD700' },
  '😅':  { lib: 'mci', name: 'emoticon-confused-outline', color: '#FFD700' },
  '🗺️':  { lib: 'ion', name: 'map-outline',            color: '#4CAF50' },
  '🤖':  { lib: 'mci', name: 'robot',                  color: '#6C63FF' },
  '📊':  { lib: 'mci', name: 'chart-bar',              color: '#2196F3' },
  '⚡':  { lib: 'mci', name: 'lightning-bolt',         color: '#FFC107' },
  '🔥':  { lib: 'mci', name: 'fire',                   color: '#FF5722' },
  '🧸':  { lib: 'mci', name: 'teddy-bear',             color: '#FF9800' },
  '🎁':  { lib: 'mci', name: 'gift',                   color: '#E91E63' },
  '🌲':  { lib: 'mci', name: 'tree',                   color: '#2E7D32' },
  '🏜️':  { lib: 'mci', name: 'terrain',                color: '#BF360C' },
  '💻':  { lib: 'mci', name: 'laptop',                 color: '#37474F' },
  '🔢':  { lib: 'mci', name: 'numeric',                color: '#37474F' },
  '✅':  { lib: 'ion', name: 'checkmark-circle',       color: '#4CAF50' },
  '✋':  { lib: 'mci', name: 'hand-back-right',        color: '#FF9800' },
  '⚠️':  { lib: 'ion', name: 'warning',                color: '#FF9800' },
  '👍':  { lib: 'mci', name: 'thumb-up',               color: '#4CAF50' },
  '💪':  { lib: 'mci', name: 'arm-flex',               color: '#E91E63' },
  '❓':  { lib: 'ion', name: 'help-circle',            color: '#9E9E9E' },
  '🤏':  { lib: 'mci', name: 'hand-pointing-up',       color: '#9C27B0' },
  '↰':   { lib: 'mci', name: 'arrow-top-left',         color: '#fff'    },
  '↱':   { lib: 'mci', name: 'arrow-top-right',        color: '#fff'    },
};

interface Props {
  emoji: string;
  size?:  number;
  color?: string;
}

export default function EmojiIcon({ emoji, size = 24, color }: Props) {
  const spec = MAP[emoji];
  if (!spec) return null;
  const c = color ?? spec.color;
  if (spec.lib === 'ion') {
    return <Ionicons name={spec.name as any} size={size} color={c} />;
  }
  return <MaterialCommunityIcons name={spec.name as any} size={size} color={c} />;
}
