
import axios from 'axios';
import { sendCommand, type CommandResult } from './robotAPI';

export interface HeartRateReading {
  bpm:    number;
  spo2?:  number;
  ready?: boolean;
}

/**
 * Tell the ESP32 which heart-rate visualisation to show on the OLED.
 *
 * ESP32 endpoint:  GET /heartMode?mode={mode}
 * Valid modes:     beating_heart | bar_graph | color_pulse |
 *                  game_meter    | energy    | power_level
 *
 * OLED rendering examples:
 *   beating_heart → animated heart icon drawn with drawCircle calls
 *   bar_graph     → vertical bars refreshed each BPM tick
 *   color_pulse   → full-display invert toggle at BPM rate
 *   game_meter    → horizontal progress bar updated each beat
 *   energy        → vertical battery bar that fills on each beat
 *   power_level   → large BPM number with segmented bar
 */
export async function sendHeartMode(
  robotIP: string,
  mode: string,
): Promise<CommandResult> {
  return sendCommand(robotIP, `heartMode?mode=${encodeURIComponent(mode)}`);
}

/**
 * Fetch the current heart rate from the MAX30100 sensor on the ESP32.
 * ESP32 endpoint: GET /heartrate  →  { "bpm": 75, "spo2": 98 }
 * Returns null when the robot is unreachable or the sensor is warming up.
 */
export async function fetchHeartRate(robotIP: string): Promise<HeartRateReading | null> {
  try {
    const res = await axios.get<HeartRateReading>(`http://${robotIP}/heartrate`, { timeout: 3000 });
    const { bpm, ready } = res.data;
    if (ready === true && typeof bpm === 'number' && bpm > 0) return res.data;
    return null;
  } catch {
    return null;
  }
}
