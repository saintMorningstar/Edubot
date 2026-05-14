#include "dht11.h"
#include "../system/config.h"
#include "../system/logger.h"
#include <DHTesp.h>

static DHTesp  dht;
static float   lastTemp   = 25.0f;
static float   lastHumid  = 60.0f;
static unsigned long lastRead = 0;
#define DHT_READ_MS 2000UL

void initDHT11() {
    dht.setup(DHT11_PIN, DHTesp::DHT11);
    logInfo("DHT11 ready on GPIO13");
}

float getTemperature() {
    if (millis() - lastRead > DHT_READ_MS) {
        lastRead = millis();
        TempAndHumidity th = dht.getTempAndHumidity();
        if (dht.getStatus() == DHTesp::ERROR_NONE) {
            lastTemp  = th.temperature;
            lastHumid = th.humidity;
        }
    }
    return lastTemp;
}

float getHumidity() {
    getTemperature();  // refresh cache if needed
    return lastHumid;
}
