/**
 * src/services/feedbackService.ts
 *
 * One-stop shop for child-friendly feedback: sound + voice + haptics.
 * Import just the function you need; no setup required.
 *
 * Usage:
 *   import { successFeedback, errorFeedback, tapFeedback, bigSuccessFeedback }
 *     from '../services/feedbackService';
 *
 *   successFeedback();      // correct answer
 *   errorFeedback();        // wrong answer
 *   bigSuccessFeedback();   // completed a level / program
 *   tapFeedback();          // any UI button press
 */

import * as Haptics from 'expo-haptics';
import { soundService } from './soundService';
import { speak, randomPhrase } from './voiceService';

// ── internal helpers ──────────────────────────────────────────────────────────

async function hNotify(type: Haptics.NotificationFeedbackType) {
  try { await Haptics.notificationAsync(type); } catch { /* no haptics */ }
}

async function hImpact(style: Haptics.ImpactFeedbackStyle) {
  try { await Haptics.impactAsync(style); } catch { /* no haptics */ }
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Correct-answer feedback:
 *  • ascending two-tone sound
 *  • excited voice praise
 *  • success haptic pulse
 */
export function successFeedback(): void {
  soundService.play('correct');
  speak(randomPhrase('correct'), 'excited');
  hNotify(Haptics.NotificationFeedbackType.Success);
}

/**
 * Wrong-answer feedback:
 *  • gentle descending sweep
 *  • calm encouragement
 *  • soft warning haptic
 */
export function errorFeedback(): void {
  soundService.play('wrong');
  speak(randomPhrase('wrong'), 'calm');
  hNotify(Haptics.NotificationFeedbackType.Warning);
}

/**
 * Level / program completion feedback:
 *  • full celebratory arpeggio
 *  • super-excited praise
 *  • strong success haptic
 */
export function bigSuccessFeedback(): void {
  soundService.play('success');
  speak(randomPhrase('success'), 'excited');
  hNotify(Haptics.NotificationFeedbackType.Success);
}

/**
 * Soft UI-tap feedback:
 *  • quick click sound
 *  • light haptic tap
 */
export function tapFeedback(): void {
  soundService.play('tap');
  hImpact(Haptics.ImpactFeedbackStyle.Light);
}
