import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MeshipayBrand } from '@/constants/meshipay-brand';

type QrScannerProps = {
  onScan: (data: string) => void;
  onClose: () => void;
};

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (scanned) {
        return;
      }
      setScanned(true);
      onScan(data);
    },
    [onScan, scanned],
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.copy}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.copy}>Camera access is required to scan gate QR codes.</Text>
        <Pressable accessibilityRole="button" onPress={() => requestPermission()} style={styles.btn}>
          <Text style={styles.btnText}>ALLOW CAMERA</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>CANCEL</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Align receiver QR inside the frame</Text>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>CLOSE</Text>
        </Pressable>
        {scanned ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setScanned(false)}
            style={styles.rescanBtn}>
            <Text style={styles.closeText}>SCAN AGAIN</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MeshipayBrand.background },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  frame: {
    width: 260,
    height: 260,
    borderWidth: 4,
    borderColor: MeshipayBrand.primary,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: {
    color: MeshipayBrand.foreground,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: MeshipayBrand.background,
  },
  copy: {
    color: MeshipayBrand.foreground,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    borderRadius: 12,
    backgroundColor: MeshipayBrand.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  btnText: {
    color: MeshipayBrand.border,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryBtn: { padding: 12 },
  secondaryText: {
    color: MeshipayBrand.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  closeBtn: {
    borderWidth: 2,
    borderColor: MeshipayBrand.border,
    borderRadius: 10,
    backgroundColor: MeshipayBrand.backgroundElevated,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  rescanBtn: {
    borderWidth: 2,
    borderColor: MeshipayBrand.primary,
    borderRadius: 10,
    backgroundColor: MeshipayBrand.backgroundElevated,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeText: {
    color: MeshipayBrand.foreground,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
