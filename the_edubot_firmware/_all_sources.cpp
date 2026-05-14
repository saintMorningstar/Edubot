// Arduino IDE only compiles .cpp files in the sketch root, not subdirectories.
// This file pulls in every module so the linker can resolve all symbols.

#include <Arduino.h>

#include "system/logger.cpp"
#include "system/watchdog.cpp"
#include "system/states.cpp"
#include "system/tasks.cpp"
#include "system/events.cpp"
#include "system/scheduler.cpp"
#include "system/config.cpp"

#include "audio/dfplayer.cpp"
#include "audio/audio_manager.cpp"
#include "audio/volume_control.cpp"
#include "audio/voice_control.cpp"

#include "bluetooth/ble_server.cpp"
#include "bluetooth/ble_services.cpp"
#include "bluetooth/ble_characteristics.cpp"
#include "bluetooth/ble_callbacks.cpp"
#include "bluetooth/ble_notifications.cpp"
#include "bluetooth/ble_commands.cpp"

#include "motion/servos.cpp"
#include "motion/poses.cpp"
#include "motion/walking.cpp"
#include "motion/dancing.cpp"
#include "motion/motion_manager.cpp"
#include "motion/gait_engine.cpp"
#include "motion/servo_calibration.cpp"

#include "display/oled.cpp"
#include "display/expressions.cpp"
#include "display/animations.cpp"
#include "display/face_manager.cpp"
#include "display/eye_engine.cpp"
#include "display/mouth_engine.cpp"

#include "behavior/emotions.cpp"
#include "behavior/reactions.cpp"
#include "behavior/routines.cpp"
#include "behavior/personality.cpp"
#include "behavior/mood_manager.cpp"
#include "behavior/interaction_engine.cpp"

#include "sensors/touch.cpp"
#include "sensors/ultrasonic.cpp"
#include "sensors/dht11.cpp"
#include "sensors/max30100.cpp"
#include "sensors/imu.cpp"

#include "storage/preferences_manager.cpp"
#include "storage/sd_manager.cpp"

#include "safety/failsafe.cpp"
#include "safety/power_management.cpp"
#include "safety/thermal_monitor.cpp"

#include "app/app_protocol.cpp"
#include "app/packet_handler.cpp"

#include "peripherals/led_manager.cpp"
