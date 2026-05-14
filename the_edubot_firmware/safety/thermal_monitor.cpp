#include "thermal_monitor.h"
#include "../sensors/dht11.h"
#include "../system/logger.h"
#include "../safety/failsafe.h"

#define MAX_SAFE_TEMP_C  55.0f

void monitorTemperature() {
    float temp = getTemperature();
    if (temp > MAX_SAFE_TEMP_C) {
        logError(String("Overtemp: ") + temp + "C — emergency stop");
        emergencyStop();
    }
}
