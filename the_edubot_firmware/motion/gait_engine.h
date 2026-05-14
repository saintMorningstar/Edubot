#ifndef GAIT_ENGINE_H
#define GAIT_ENGINE_H

void initGaitEngine();
void updateWalkingCycle();
void setGaitDirection(int dir);  // 0=stop,1=fwd,2=bwd,3=left,4=right

#endif // GAIT_ENGINE_H
