#ifndef MAX30100_SENSOR_H
#define MAX30100_SENSOR_H

void initMAX30100();

float getHeartRate();
float getSpO2();

bool fingerDetected();

#endif