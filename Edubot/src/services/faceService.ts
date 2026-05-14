
import { sendCommand, type CommandResult } from './robotAPI';

/**
 * Send a face expression to the robot's OLED display.
 *
 * ESP32 endpoint:  GET /face?id={faceId}
 * OLED format:     128×64 pixels
 * Example:         GET http://192.168.1.x/face?id=happy_1
 *
 * The ESP32 firmware should maintain a lookup table mapping each face ID
 * to a set of pixel draw calls for the SSD1306 OLED library, e.g.:
 *   happy_1  → drawCircle eyes + curved smile arc
 *   sad_1    → drawCircle eyes + inverted arc
 *   sleeping → horizontal lines for eyes + flat mouth
 */
export async function sendFaceToRobot(
  robotIP: string,
  faceId: string,
): Promise<CommandResult> {
  return sendCommand(robotIP, `face?id=${encodeURIComponent(faceId)}`);
}
