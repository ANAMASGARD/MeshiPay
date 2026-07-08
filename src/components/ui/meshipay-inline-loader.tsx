import { StyleSheet, View, type ViewStyle } from 'react-native';

import { MeshipayDotsLoader } from '@/components/ui/meshipay-dots-loader';

type MeshipayInlineLoaderProps = {
  label?: string;
  height?: number;
  style?: ViewStyle;
};

export function MeshipayInlineLoader({ label, height = 120, style }: MeshipayInlineLoaderProps) {
  return (
    <View style={[styles.wrap, { minHeight: height }, style]}>
      <MeshipayDotsLoader size="md" label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
  },
});
