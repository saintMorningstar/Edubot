# Edubot Wiring Notes — ESP32-S3

## Existing hardware (unchanged)

| Component | Pin | GPIO |
|-----------|-----|------|
| OLED SSD1306 SDA | I2C | 21 |
| OLED SSD1306 SCL | I2C | 22 |
| MAX30100 SDA | I2C (shared) | 21 |
| MAX30100 SCL | I2C (shared) | 22 |
| DHT11 | Data | 13 |
| TTP223 Touch | Signal | 15 |
| LED 1 | Anode (via 220 Ω) | 18 |
| LED 2 | Anode (via 220 Ω) | 19 |
| L Hip servo | PWM | 32 |
| L Foot servo | PWM | 33 |
| L Hand servo | PWM | 25 |
| R Hip servo | PWM | 27 |
| R Foot servo | PWM | 26 |
| R Hand servo | PWM | 14 |

## New I2S audio hardware

### INMP441 I2S Microphone
```
INMP441 → ESP32-S3
VDD  → 3.3 V
GND  → GND
WS   → GPIO 4
SCK  → GPIO 5
SD   → GPIO 6
L/R  → GND      ← selects LEFT channel (required)
```

### MAX98357A I2S Amplifier
```
MAX98357A → ESP32-S3
VIN  → 5 V (or 3.3 V, lower volume)
GND  → GND
LRC  → GPIO 7
BCLK → GPIO 8
DIN  → GPIO 9
GAIN → GND      ← sets 9 dB gain (leave floating for 12 dB, or tie to 3.3 V for 15 dB)
SD   → leave unconnected (or tie to 3.3 V to enable always)
```

Connect a small 4–8 Ω speaker to the MAX98357A OUT+ / OUT– terminals.

## Power notes
- Servos draw peak ~500 mA each → use a separate 5 V / 3 A supply for the servo rail.
- Decouple servo power from MCU power (common GND, separate VCC).
- ESP32-S3 + audio: a USB power bank at 5 V / 1 A is sufficient for the MCU, sensors, and OLED.
