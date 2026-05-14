#ifndef OLED_H
#define OLED_H

#include <Adafruit_SSD1306.h>

extern Adafruit_SSD1306 display;

void initOLED();
void clearDisplay();
void updateDisplay();

#endif // OLED_H
