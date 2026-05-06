#pragma once
#include <Arduino.h>

void        wifiSetup();
bool        wifiLoop();          // call each loop(); returns true once on connect
bool        wifiConnected();
const char* wifiGetIP();
bool        wifiTimedOut();
