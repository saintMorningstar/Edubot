#include "states.h"
#include "logger.h"

RobotState currentState = IDLE;

void setState(RobotState newState) {
    if (currentState == newState) return;
    currentState = newState;
    logInfo(String("State -> ") + stateToString(newState));
}

RobotState getState() {
    return currentState;
}

const char* stateToString(RobotState s) {
    switch (s) {
        case IDLE:      return "IDLE";
        case WALKING:   return "WALKING";
        case DANCING:   return "DANCING";
        case SLEEPING:  return "SLEEPING";
        case LISTENING: return "LISTENING";
        case THINKING:  return "THINKING";
        case SPEAKING:  return "SPEAKING";
        default:        return "UNKNOWN";
    }
}
