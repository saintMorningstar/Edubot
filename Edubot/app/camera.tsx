

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useRobot } from '../src/context/RobotContext';
import { getCameraStreamURL, getCameraSnapshotURL } from '../src/services/robotAPI';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../src/utils/constants';

export default function CameraScreen() {
  const { robotIP } = useRobot();
  const [loading, setLoading] = useState(true);

  const streamURL   = getCameraStreamURL(robotIP);
  const snapshotURL = getCameraSnapshotURL(robotIP);

  const streamHTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#111; display:flex; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; }
    img  { width:100%; height:100%; object-fit:contain; }
    #msg { color:#fff; text-align:center; padding:24px; font-size:18px; line-height:1.6; display:none; }
  </style>
</head>
<body>
  <img src="${streamURL}"
    onerror="this.style.display='none'; document.getElementById('msg').style.display='block';"
  />
  <div id="msg">
    Camera stream not available.<br>
    Make sure the ESP32-CAM module is powered on<br>
    and serving on port 81.
  </div>
</body>
</html>`;

  const handleCapture = () => {
    Alert.alert(
      'Snapshot URL',
      `${snapshotURL}\n\nIntegrate expo-media-library to save this JPEG to the device gallery.`,
      [{ text: 'OK' }],
    );
  };

  return (
    <View style={styles.bg}>
     
      <View style={styles.infoBar}>
        <Ionicons name="wifi" size={16} color="#888" />
        <Text style={styles.infoText}>  {streamURL}</Text>
      </View>

      
      <View style={styles.streamBox}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <Ionicons name="camera-outline" size={48} color={COLORS.primary} />
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={{ marginTop: SPACING.md }}
            />
            <Text style={styles.loadingText}>Loading camera feed…</Text>
          </View>
        )}

        <WebView
          style={styles.webview}
          source={{ html: streamHTML }}
          onLoad={()  => setLoading(false)}
          onError={() => setLoading(false)}
          scrollEnabled={false}
          javaScriptEnabled
          cacheEnabled={false}
        />
      </View>

     
      <View style={styles.controls}>
        <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
          <Ionicons name="camera" size={26} color={COLORS.white} />
          <Text style={styles.captureBtnText}>  Capture Photo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Make sure the ESP32-CAM module is running and on the same network.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000' },

  infoBar: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#111',
    padding:         SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  infoText: { color: '#888', fontSize: FONT_SIZES.small },

  streamBox: { flex: 1, position: 'relative', backgroundColor: '#111' },
  webview:   { flex: 1, backgroundColor: '#000' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#111',
    zIndex:          10,
  },
  loadingText: {
    color:     COLORS.white,
    marginTop: SPACING.md,
    fontSize:  FONT_SIZES.medium,
  },

  controls: {
    backgroundColor: '#111',
    padding:         SPACING.md,
    alignItems:      'center',
  },
  captureBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   COLORS.primary,
    paddingVertical:   SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius:      BORDER_RADIUS.pill,
  },
  captureBtnText: {
    color:      COLORS.white,
    fontSize:   FONT_SIZES.large,
    fontWeight: 'bold',
  },

  hint: {
    color:           '#444',
    fontSize:        FONT_SIZES.small,
    textAlign:       'center',
    padding:         SPACING.sm,
    backgroundColor: '#111',
  },
});
