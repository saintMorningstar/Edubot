#include "events.h"
#include "logger.h"

void triggerEvent(String eventName) {
    logInfo(String("Event: ") + eventName);
}
