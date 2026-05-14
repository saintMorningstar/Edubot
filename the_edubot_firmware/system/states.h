#ifndef STATES_H
#define STATES_H

enum RobotState {
    IDLE,
    WALKING,
    DANCING,
    SLEEPING,
    LISTENING,
    THINKING,
    SPEAKING
};

extern RobotState currentState;

void setState(RobotState newState);
RobotState getState();
const char* stateToString(RobotState s);

#endif // STATES_H
