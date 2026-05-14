/**
 * Child-friendly custom modal dialog.
 * Uses a vector icon circle instead of an emoji character.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../utils/constants';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(SW - SPACING.xl * 2, 390);

export interface EdubotDialogProps {
  visible:       boolean;
  iconName:      string;    // Ionicons icon name
  iconColor?:    string;    // icon + circle tint colour; defaults to COLORS.primary
  title:         string;
  message?:      string;
  confirmText:   string;
  confirmColor?: string;
  onConfirm:     () => void;
  cancelText?:   string;
  cancelColor?:  string;
  onCancel?:     () => void;
}

export default function EdubotDialog({
  visible,
  iconName  = 'information-circle',
  iconColor = COLORS.primary,
  title,
  message,
  confirmText,
  confirmColor,
  onConfirm,
  cancelText,
  cancelColor,
  onCancel,
}: EdubotDialogProps) {
  const hasCancel = !!onCancel && !!cancelText;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
      onRequestClose={onCancel ?? onConfirm}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* Icon circle */}
          <View style={[styles.iconCircle, { backgroundColor: iconColor + '1A' }]}>
            <Ionicons name={iconName as any} size={48} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>

          {message ? (
            <Text style={styles.message}>{message}</Text>
          ) : null}

          <View style={[styles.btnRow, !hasCancel && styles.btnRowSingle]}>
            {hasCancel && (
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.cancelBtn,
                  cancelColor ? { backgroundColor: cancelColor } : null,
                ]}
                onPress={onCancel}
                activeOpacity={0.72}
              >
                <Text style={styles.cancelTxt}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.btn,
                styles.confirmBtn,
                confirmColor ? { backgroundColor: confirmColor } : null,
                !hasCancel && styles.btnFull,
              ]}
              onPress={onConfirm}
              activeOpacity={0.72}
            >
              <Text style={styles.confirmTxt}>{confirmText}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex:              1,
    backgroundColor:   'rgba(0,0,0,0.58)',
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: SPACING.lg,
  },

  card: {
    width:             CARD_W,
    backgroundColor:   COLORS.white,
    borderRadius:      BORDER_RADIUS.large + 6,
    paddingVertical:   SPACING.xl + 4,
    paddingHorizontal: SPACING.xl,
    alignItems:        'center',
    elevation:         14,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 6 },
    shadowOpacity:     0.28,
    shadowRadius:      14,
  },

  iconCircle: {
    width:          88,
    height:         88,
    borderRadius:   44,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   SPACING.md,
  },

  title: {
    fontSize:     FONT_SIZES.xlarge,
    fontWeight:   'bold',
    color:        COLORS.text,
    textAlign:    'center',
    marginBottom: SPACING.sm,
  },

  message: {
    fontSize:     FONT_SIZES.medium + 1,
    color:        COLORS.textLight,
    textAlign:    'center',
    lineHeight:   26,
    marginBottom: SPACING.lg,
  },

  btnRow:       { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md, width: '100%' },
  btnRowSingle: { justifyContent: 'center' },

  btn: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: SPACING.md + 4,
    borderRadius:    BORDER_RADIUS.large,
    minHeight:       64,
    elevation:       3,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.18,
    shadowRadius:    4,
  },
  btnFull: { flex: 0, width: '80%' },

  cancelBtn:  { backgroundColor: '#EBEBEB' },
  confirmBtn: { backgroundColor: COLORS.primary },

  cancelTxt: {
    fontSize:   FONT_SIZES.large,
    fontWeight: 'bold',
    color:      COLORS.text,
    textAlign:  'center',
  },
  confirmTxt: {
    fontSize:   FONT_SIZES.large,
    fontWeight: 'bold',
    color:      COLORS.white,
    textAlign:  'center',
  },
});
