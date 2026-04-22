# ESP32-CAM WebRTC Firmware v2.1

## Overview

This firmware enables the ESP32-CAM module to stream video via WebRTC protocol to any browser, targeting end-to-end latency of less than 100ms.

## Architecture

The firmware implements WebRTC signaling directly on the ESP32:

1. **HTTP Server (port 80)**: Serves the video viewer HTML page
2. **WebSocket Server (port 81)**: Handles WebRTC SDP offer/answer exchange + ICE candidates
3. **JPEG Streaming**: Camera frames sent via WebSocket binary data

## Hardware

- **Module**: ESP32-CAM (AI-Thinker)
- **Camera Sensor**: OV2640
- **Flash**: 4MB Flash + 4MB PSRAM

## Features

- WebRTC video streaming with embedded signaling
- Browser-based viewer (no native app required)
- JPEG capture from OV2640 at 15 FPS (640x480)
- Configurable frame rate
- Auto-reconnect WiFi with retry logic
- Real-time frame display via HTML5 Canvas

## Quick Start

1. Edit `esp32_cam_webrtc.ino` with your WiFi credentials:
   ```cpp
   #define WIFI_SSID "YourNetwork"
   #define WIFI_PASS "YourPassword"
   ```

2. Build and upload with PlatformIO:
   ```bash
   cd firmware/esp32_cam_webrtc
   pio run --target upload
   pio run --target monitor
   ```

3. Open browser to `http://<esp32-ip>` and click "Start Video"

## WebRTC Signaling Flow

```
[Browser]                         [ESP32-CAM]
    |                                   |
    |  1. WebSocket Connect            |
    |---------------------------------->|
    |                                   |
    |  2. SDP Offer (JSON)             |
    |<----------------------------------|
    |                                   |
    |  3. SDP Answer (JSON)            |
    |---------------------------------->|
    |                                   |
    |  4. ICE Candidates (JSON)         |
    |<--------------------------------->|
    |                                   |
    |  5. JPEG Frames (binary)          |
    |<----------------------------------|
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| VIDEO_WIDTH | 640 | Frame width in pixels |
| VIDEO_HEIGHT | 480 | Frame height in pixels |
| VIDEO_FPS | 15 | Frames per second |
| HTTP_PORT | 80 | HTTP server port |
| WS_PORT | 81 | WebSocket server port |
| WIFI_SSID | RoboKids_Lab | WiFi network name |
| WIFI_PASS | robokids2024 | WiFi password |

## Wiring

The ESP32-CAM has OV2640 pre-soldered. Just connect power and ensure the camera ribbon cable is properly seated.

### Power Requirements
- Use a quality 5V 2A power supply
- Avoid powering from USB-only (insufficient current)
- Common GPIO connections already configured in firmware

## Latency Optimization

To achieve <100ms latency:
1. Use local WiFi network (avoid internet routing)
2. Enable PSRAM for double-buffering
3. Set JPEG quality 10-12
4. Use high-quality WiFi AP
5. Reduce video FPS if needed

## Troubleshooting

### Camera init fails
- Check camera ribbon cable connection
- Ensure PSRAM is enabled in menuconfig
- Try reducing resolution to FRAMESIZE_QVGA (320x240)
- Verify power supply provides sufficient current

### WebRTC connection fails
- Verify WiFi is connected (check serial output for IP)
- Check browser console for JavaScript errors
- Ensure firewall allows WebSocket connections
- Try refreshing and clicking "Start Video" again

### High latency
- Reduce video resolution
- Lower JPEG quality setting
- Reduce FPS
- Use wired Ethernet adapter

### No video displayed
- Ensure DataChannel opens successfully (check status)
- Verify browser supports WebRTC (Chrome, Firefox, Edge recommended)
- Check that WS_PORT (81) is not blocked by firewall

## Building with PlatformIO

```bash
# Install dependencies
pio pkg install

# Upload firmware
pio run --target upload

# View serial output
pio device monitor

# Build only
pio run
```

## File Structure

```
esp32_cam_webrtc/
├── esp32_cam_webrtc.ino    # Main firmware
├── platformio.ini          # PlatformIO configuration
└── README.md              # This file
```