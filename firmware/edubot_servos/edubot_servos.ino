// ─────────────────────────────────────────────────────────────────────────────
// EduBot Servo Firmware  –  ESP32 + 6× SG90 (positional)
//
// Key facts baked into this firmware:
//   • SG90 true neutral is ~96°, NOT 90°  (per physical testing)
//   • Deadband: ±2° around neutral = no movement (stable zone 94–98°)
//   • Each servo gets its own calibrated neutral to absorb unit variation
//   • All motion is expressed as *offset from neutral* — never raw angle
//   • Mirror-mounted servos use a reversed flag (same offset = symmetric move)
// ─────────────────────────────────────────────────────────────────────────────

#include <ESP32Servo.h>

// ─── Hardware constants ───────────────────────────────────────────────────────

#define SERVO_COUNT   6
#define PWM_FREQ_HZ   50       // standard servo PWM frequency
#define PULSE_MIN_US  500      // SG90 min pulse  (≈ 0°)
#define PULSE_MAX_US  2400     // SG90 max pulse  (≈ 180°)

// ─── Per-servo calibration ────────────────────────────────────────────────────
//
// neutral   – true stop angle found by testing (expect 94–98 range)
// minOffset – furthest negative offset allowed  (prevents mechanical damage)
// maxOffset – furthest positive offset allowed
// reversed  – true for servos mounted mirrored so +offset = same body direction
//             as +offset on the opposite side
//
// Label conventions (adjust to your physical layout):
//   0 = Front-Left  (FL)    1 = Front-Right (FR)
//   2 = Middle-Left (ML)    3 = Middle-Right (MR)
//   4 = Rear-Left   (RL)    5 = Rear-Right  (RR)

struct ServoConfig {
  uint8_t pin;
  int8_t  neutral;    // calibrated center angle  (tune per servo)
  int8_t  minOffset;  // most negative offset from neutral
  int8_t  maxOffset;  // most positive offset from neutral
  bool    reversed;   // flip direction for mirror-mounted units
};

ServoConfig CFG[SERVO_COUNT] = {
  //  pin   neutral  minOff  maxOff  reversed
  {  13,    96,      -60,    60,     false },  // 0: FL
  {  14,    96,      -60,    60,     true  },  // 1: FR  ← mirrored
  {  27,    96,      -60,    60,     false },  // 2: ML
  {  26,    96,      -60,    60,     true  },  // 3: MR  ← mirrored
  {  25,    96,      -60,    60,     false },  // 4: RL
  {  18,    96,      -60,    60,     true  },  // 5: RR  ← mirrored
};

// ─── Deadband ─────────────────────────────────────────────────────────────────
// Any offset whose absolute value is below this snaps to 0 (exact neutral).
// Eliminates the micro-drift seen at 90° with uncalibrated firmware.

#define DEADBAND  2   // degrees  (±2 around neutral = stable)

// ─── Runtime state ────────────────────────────────────────────────────────────

Servo servos[SERVO_COUNT];
int   lastOffset[SERVO_COUNT];   // last commanded offset for each servo

// ─── Low-level helpers ────────────────────────────────────────────────────────

inline int clamp(int v, int lo, int hi) { return v < lo ? lo : v > hi ? hi : v; }

/**
 * Write an *offset* from the servo's calibrated neutral to the hardware.
 *
 * Steps:
 *   1. Snap tiny offsets to 0 (deadband → no drift at rest)
 *   2. Clamp to configured safe range
 *   3. Flip sign for reversed (mirror-mounted) servos
 *   4. Write final absolute angle
 */
void servoWriteOffset(uint8_t idx, int offset) {
  // 1. Deadband
  if (offset > -DEADBAND && offset < DEADBAND) offset = 0;

  // 2. Clamp to safe mechanical range
  offset = clamp(offset, CFG[idx].minOffset, CFG[idx].maxOffset);

  // 3. Reversed servos: flip the offset so the body moves symmetrically
  int writeOffset = CFG[idx].reversed ? -offset : offset;

  // 4. Absolute angle = neutral ± offset, clamped to physical servo range
  int angle = clamp(CFG[idx].neutral + writeOffset, 0, 180);

  lastOffset[idx] = offset;
  servos[idx].write(angle);
}

// Convenience: write the same offset to every servo at once
void writeAllOffsets(int offsets[SERVO_COUNT]) {
  for (uint8_t i = 0; i < SERVO_COUNT; i++) servoWriteOffset(i, offsets[i]);
}

// ─── Pose functions ───────────────────────────────────────────────────────────

/**
 * Stand pose — all servos at calibrated neutral.
 * Because of the deadband logic, this is guaranteed drift-free.
 */
void standPose() {
  for (uint8_t i = 0; i < SERVO_COUNT; i++) servoWriteOffset(i, 0);
  Serial.println("[STAND] Neutral pose — all servos at calibrated center");
}

// ─── Smooth interpolation ─────────────────────────────────────────────────────

/**
 * Glide all 6 servos from their current offsets to targetOffsets[]
 * over `steps` increments with `stepMs` delay between each.
 *
 * Lower stepMs = faster;  more steps = smoother arc.
 * Typical: steps=20, stepMs=10  →  200ms total transition
 */
void glideTo(int targetOffsets[SERVO_COUNT], uint8_t steps = 20, uint8_t stepMs = 10) {
  int startOffsets[SERVO_COUNT];
  for (uint8_t i = 0; i < SERVO_COUNT; i++) startOffsets[i] = lastOffset[i];

  for (uint8_t s = 1; s <= steps; s++) {
    for (uint8_t i = 0; i < SERVO_COUNT; i++) {
      int off = startOffsets[i] + ((targetOffsets[i] - startOffsets[i]) * (int)s) / steps;
      servoWriteOffset(i, off);
    }
    delay(stepMs);
  }
}

/**
 * Sweep a single servo from `fromOffset` to `toOffset` with stepMs per degree.
 * Useful during calibration to find the true deadband edges.
 */
void sweepOne(uint8_t idx, int fromOffset, int toOffset, uint8_t stepMs = 8) {
  int step = (toOffset >= fromOffset) ? 1 : -1;
  for (int off = fromOffset; off != toOffset + step; off += step) {
    servoWriteOffset(idx, off);
    delay(stepMs);
  }
}

// ─── Calibration / diagnostic sweep ──────────────────────────────────────────

/**
 * Individually sweep each servo ±SWEEP° from neutral, then return.
 * Watch each servo while this runs to verify direction and confirm neutral.
 * Serial output names which servo is moving.
 */
#define SWEEP_AMP 25

void calibrationSweep() {
  const char* labels[] = { "FL", "FR", "ML", "MR", "RL", "RR" };
  Serial.println("[CAL] Starting per-servo calibration sweep...");
  standPose();
  delay(800);

  for (uint8_t i = 0; i < SERVO_COUNT; i++) {
    Serial.printf("[CAL] Servo %d (%s) pin=%d  neutral=%d\n",
                  i, labels[i], CFG[i].pin, CFG[i].neutral);
    sweepOne(i, 0,  SWEEP_AMP, 8);   // swing positive
    delay(300);
    sweepOne(i,  SWEEP_AMP, -SWEEP_AMP, 8); // swing negative
    delay(300);
    sweepOne(i, -SWEEP_AMP, 0, 8);  // return to neutral
    delay(400);
  }

  standPose();
  Serial.println("[CAL] Sweep complete — check each servo moved correctly.");
}

// ─── Gait: alternating tripod (hexapod) ──────────────────────────────────────
//
// Servos are arranged as 3 pairs (left/right). A tripod gait moves Group A
// (FL, MR, RL) and Group B (FR, ML, RR) in alternation.
//
// Positive offset on a LEFT servo  = leg swings FORWARD
// Positive offset on a RIGHT servo = leg swings FORWARD  (reversed flag handles this)
//
// STEP_AMP:  how far each leg swings fore/aft (degrees from neutral)
//            Start at 15–20 and increase once stable.

#define STEP_AMP   18    // swing amplitude in degrees
#define STEP_SPEED 10    // ms per interpolation tick (lower = faster walking)
#define STEP_STEPS 18    // interpolation steps per phase

/**
 * One complete forward stride (two phases).
 * Call repeatedly in loop() to walk forward.
 */
void stepForward() {
  int phaseA[SERVO_COUNT];
  int phaseB[SERVO_COUNT];

  // Phase A: Group A (0,3,4 = FL,MR,RL) swings forward
  //          Group B (1,2,5 = FR,ML,RR) pushes back
  phaseA[0] =  STEP_AMP;   // FL  → forward
  phaseA[1] = -STEP_AMP;   // FR  → backward push
  phaseA[2] = -STEP_AMP;   // ML  → backward push
  phaseA[3] =  STEP_AMP;   // MR  → forward
  phaseA[4] =  STEP_AMP;   // RL  → forward
  phaseA[5] = -STEP_AMP;   // RR  → backward push

  // Phase B: groups swap roles
  phaseB[0] = -STEP_AMP;
  phaseB[1] =  STEP_AMP;
  phaseB[2] =  STEP_AMP;
  phaseB[3] = -STEP_AMP;
  phaseB[4] = -STEP_AMP;
  phaseB[5] =  STEP_AMP;

  glideTo(phaseA, STEP_STEPS, STEP_SPEED);
  delay(40);
  glideTo(phaseB, STEP_STEPS, STEP_SPEED);
  delay(40);
}

/**
 * Turn left: Group A swings forward, Group B backward — but at half amplitude.
 * Effective for gentle pivot turns.
 */
void turnLeft() {
  int pose[SERVO_COUNT] = { STEP_AMP, STEP_AMP, STEP_AMP, -STEP_AMP, -STEP_AMP, -STEP_AMP };
  glideTo(pose, STEP_STEPS, STEP_SPEED);
  delay(80);
  standPose();
  delay(40);
}

void turnRight() {
  int pose[SERVO_COUNT] = { -STEP_AMP, -STEP_AMP, -STEP_AMP, STEP_AMP, STEP_AMP, STEP_AMP };
  glideTo(pose, STEP_STEPS, STEP_SPEED);
  delay(80);
  standPose();
  delay(40);
}

// ─── Serial command interface (for tuning without reflashing) ─────────────────
//
// Open Serial Monitor at 115200 baud and send:
//   s         → stand pose
//   t         → calibration sweep
//   f         → walk forward (4 steps)
//   l / r     → turn left / right
//   0..5 +NN  → move servo N to offset +NN  (e.g.  "2 +20")
//   0..5 -NN  → move servo N to offset -NN  (e.g.  "3 -15")
//   n NN      → set neutral for servo N (e.g.  "n 2 97")

void handleSerial() {
  if (!Serial.available()) return;
  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  char cmd = line[0];

  if (cmd == 's') {
    standPose();

  } else if (cmd == 't') {
    calibrationSweep();

  } else if (cmd == 'f') {
    for (uint8_t i = 0; i < 4; i++) stepForward();
    standPose();

  } else if (cmd == 'l') {
    turnLeft();

  } else if (cmd == 'r') {
    turnRight();

  } else if (cmd == 'n') {
    // "n <idx> <value>"  — set neutral for servo idx
    int idx = 0, val = 96;
    sscanf(line.c_str() + 1, " %d %d", &idx, &val);
    if (idx >= 0 && idx < SERVO_COUNT && val >= 60 && val <= 120) {
      CFG[idx].neutral = (int8_t)val;
      Serial.printf("[CFG] Servo %d neutral set to %d\n", idx, val);
      standPose();
    }

  } else if (cmd >= '0' && cmd <= '5') {
    // "<idx> <offset>"  — move one servo by offset
    int idx    = cmd - '0';
    int offset = 0;
    sscanf(line.c_str() + 1, " %d", &offset);
    servoWriteOffset(idx, offset);
    Serial.printf("[MOVE] Servo %d → offset %+d  (neutral=%d)\n",
                  idx, offset, CFG[idx].neutral);
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("======================================");
  Serial.println("  EduBot  –  Calibrated Servo Firmware");
  Serial.println("  SG90 neutral ~96°, deadband ±2°");
  Serial.println("======================================");

  // ESP32Servo needs timers pre-allocated
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  // Attach all servos and initialise lastOffset[]
  for (uint8_t i = 0; i < SERVO_COUNT; i++) {
    servos[i].setPeriodHertz(PWM_FREQ_HZ);
    servos[i].attach(CFG[i].pin, PULSE_MIN_US, PULSE_MAX_US);
    lastOffset[i] = 0;
  }
  Serial.println("[BOOT] Servos attached");

  delay(200);
  standPose();
  Serial.println("[BOOT] Stand pose applied — robot should be stable");
  delay(1000);

  Serial.println("[BOOT] Running calibration sweep...");
  calibrationSweep();

  Serial.println();
  Serial.println("Commands: s=stand  t=sweep  f=forward  l=left  r=right");
  Serial.println("          0..5 +/-N  (move servo by offset)");
  Serial.println("          n <idx> <val>  (set neutral for servo)");
}

// ─── Loop ─────────────────────────────────────────────────────────────────────

void loop() {
  handleSerial();   // check for tuning commands at any time

  // Default behaviour: walk forward 4 steps, pause, repeat
  // Replace or wrap with WiFi/HTTP handlers when integrating with app control
  for (uint8_t i = 0; i < 4; i++) {
    stepForward();
    handleSerial();   // keep serial responsive mid-walk
  }
  standPose();
  delay(2000);
}
