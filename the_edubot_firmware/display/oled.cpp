#include "oled.h"
#include "../system/config.h"
#include "../system/logger.h"

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

void initOLED() {
    Wire.begin(I2C_SDA, I2C_SCL);
    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
        logError("OLED init failed");
        return;
    }
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(20, 28);
    display.print("Edubot Ready");
    display.display();
    logInfo("OLED ready");
}

void clearDisplay() {
    display.clearDisplay();
}

void updateDisplay() {
    display.display();
}
