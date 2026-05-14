#ifndef POWER_MANAGER_H
#define POWER_MANAGER_H

// Battery monitoring via ADC (voltage divider to 3.3V)
// BATTERY_ADC_PIN defined in config.h

void initPowerManager();
void monitorBattery();
float getBatteryVoltage();

#endif // POWER_MANAGER_H
