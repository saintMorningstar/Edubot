#pragma once
#include <Arduino.h>

#define DEFAULT_BACKEND_URL "http://192.168.1.100:3000"

// Call once in setup(), before commSetup().
// Loads saved URL from NVS; falls back to DEFAULT_BACKEND_URL if none stored.
void   initConfig();

// Persist a new server URL to NVS and update the in-memory cache.
void   saveServerUrl(const String& url);

// Return the active server URL (always non-empty after initConfig()).
String getServerUrl();

// True if the user has ever stored a custom URL (false → using compile-time default).
bool   hasServerUrl();
