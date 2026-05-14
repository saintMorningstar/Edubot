#include "packet_handler.h"
#include "../bluetooth/ble_commands.h"
#include "../system/logger.h"

void processPacket(String packet) {
    packet.trim();
    if (packet.length() == 0) return;
    logInfo(String("Packet: ") + packet);
    processBLECommand(packet);
}
