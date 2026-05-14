#include "app_protocol.h"

String encodeTelemetry(const TelemetryPacket& pkt) {
    char buf[128];
    snprintf(buf, sizeof(buf),
        "{\"b\":%.2f,\"d\":%.1f,\"h\":%.0f,\"s\":%.0f,\"t\":%.1f,\"hu\":%.0f}",
        pkt.batteryVoltage, pkt.distanceCM,
        pkt.heartRate, pkt.spO2,
        pkt.temperature, pkt.humidity);
    return String(buf);
}

TelemetryPacket decodeTelemetry(const String& json) {
    TelemetryPacket pkt = {0};
    // Simple substring parse — no ArduinoJson dependency
    auto extract = [&](const char* key) -> float {
        int idx = json.indexOf(key);
        if (idx < 0) return 0.0f;
        idx = json.indexOf(':', idx) + 1;
        return json.substring(idx).toFloat();
    };
    pkt.batteryVoltage = extract("\"b\"");
    pkt.distanceCM     = extract("\"d\"");
    pkt.heartRate      = extract("\"h\"");
    pkt.spO2           = extract("\"s\"");
    pkt.temperature    = extract("\"t\"");
    pkt.humidity       = extract("\"hu\"");
    return pkt;
}

void encodePacket() { /* reserved */ }
void decodePacket() { /* reserved */ }
