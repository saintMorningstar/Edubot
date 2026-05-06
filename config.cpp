#include "config.h"
#include <Preferences.h>

static Preferences prefs;
static String      _cachedUrl;

void initConfig() {
    prefs.begin("edubot", false);   // namespace "edubot", read-write
    _cachedUrl = prefs.getString("server_url", DEFAULT_BACKEND_URL);
    Serial.printf("[Config] server_url: %s%s\n",
                  _cachedUrl.c_str(),
                  hasServerUrl() ? "" : " (default)");
}

void saveServerUrl(const String& url) {
    _cachedUrl = url;
    prefs.putString("server_url", url);
    Serial.printf("[Config] Saved server_url: %s\n", url.c_str());
}

String getServerUrl() {
    return _cachedUrl;
}

bool hasServerUrl() {
    return prefs.isKey("server_url");
}
