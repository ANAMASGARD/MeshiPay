import { Modal, StyleSheet, View } from 'react-native';

import { MeshipayDotsLoader } from '@/components/ui/meshipay-dots-loader';

type MeshipayLoadingOverlayProps = {
  visible: boolean;
  label: string;
};

export function MeshipayLoadingOverlay({ visible, label }: MeshipayLoadingOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop} pointerEvents="auto">
        <MeshipayDotsLoader size="lg" label={label} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 16, 11, 0.85)',
    padding: 24,
  },
});
