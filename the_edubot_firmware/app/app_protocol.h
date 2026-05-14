#ifndef APP_PROTOCOL_H
#define APP_PROTOCOL_H

#include <Arduino.h>

// BLE packet format: plain text commands (phone → robot)
// Telemetry: compact JSON (robot → phone)

struct TelemetryPacket {
    float batteryVoltage;
    float distanceCM;
    float heartRate;
    float spO2;
    float temperature;
    float humidity;
};

String encodeTelemetry(const TelemetryPacket& pkt);
TelemetryPacket decodeTelemetry(const String& json);

void encodePacket();
void decodePacket();

#endif // APP_PROTOCOL_H
