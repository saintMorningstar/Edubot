

import axios, { AxiosError } from 'axios';

const COMMAND_TIMEOUT = 5_000;


const STATUS_TIMEOUT = 3_000;



export interface CommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface RobotStatus {
  battery: number;   
  status: string;    
}


function client(robotIP: string, timeout = COMMAND_TIMEOUT) {
  return axios.create({
    baseURL: `http://${robotIP}`,
    timeout,
    headers: { 'Content-Type': 'application/json' },
  });
}


export async function sendCommand(robotIP: string, path: string): Promise<CommandResult> {
  try {
    const res = await client(robotIP).get(`/${path}`);
    return { success: true, data: res.data };
  } catch (err) {
    const msg = err instanceof AxiosError ? err.message : String(err);
    console.warn(`[RobotAPI] "${path}" failed:`, msg);
    return { success: false, error: msg };
  }
}


export const moveForward  = (ip: string) => sendCommand(ip, 'forward');

export const moveBackward = (ip: string) => sendCommand(ip, 'backward');

export const turnLeft     = (ip: string) => sendCommand(ip, 'left');

export const turnRight    = (ip: string) => sendCommand(ip, 'right');

export const stopRobot    = (ip: string) => sendCommand(ip, 'stop');


export const openGrip  = (ip: string) => sendCommand(ip, 'grip_open');

export const closeGrip = (ip: string) => sendCommand(ip, 'grip_close');


export const speakWord = (ip: string, word: string) =>
  sendCommand(ip, `speak?text=${encodeURIComponent(word)}`);


export const showColor = (ip: string, color: string) =>
  sendCommand(ip, `color?name=${encodeURIComponent(color)}`);


export async function getRobotStatus(ip: string): Promise<CommandResult & { data?: RobotStatus }> {
  try {
    const res = await client(ip, STATUS_TIMEOUT).get('/status');
    return { success: true, data: res.data as RobotStatus };
  } catch (err) {
    const msg = err instanceof AxiosError ? err.message : String(err);
    return { success: false, error: msg };
  }
}


export async function pingRobot(ip: string): Promise<boolean> {
  try {
    await client(ip, STATUS_TIMEOUT).get('/status');
    return true;
  } catch {
    return false;
  }
}


export const getCameraStreamURL    = (ip: string) => `http://${ip}:81/stream`;


export const getCameraSnapshotURL  = (ip: string) => `http://${ip}/capture`;



/**
 * 
 *
 * @param ip        Robot IP address
 * @param commands  Ordered array of command paths (e.g. ['forward', 'left'])
 * @param delayMs   Pause between commands in milliseconds (default 1 200 ms)
 * @param onStep    Optional callback fired after each step: (stepIndex, result)
 */
export async function runProgram(
  ip: string,
  commands: string[],
  delayMs = 1_200,
  onStep?: (index: number, result: CommandResult) => void,
): Promise<void> {
  for (let i = 0; i < commands.length; i++) {
    const result = await sendCommand(ip, commands[i]);
    onStep?.(i, result);
    if (i < commands.length - 1) {
      // Small pause so the robot has time to complete each movement
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }

  await stopRobot(ip);
}
