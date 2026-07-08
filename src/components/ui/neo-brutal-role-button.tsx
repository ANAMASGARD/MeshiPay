import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MeshipayBrand } from '@/constants/meshipay-brand';

type NeoBrutalRoleButtonProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function NeoBrutalRoleButton({ label, selected, onPress, style }: NeoBrutalRoleButtonProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.shadow, selected ? styles.shadowSelected : null]} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          selected ? styles.buttonSelected : null,
          pressed ? styles.buttonPressed : null,
        ]}>
        <Text style={[styles.label, selected ? styles.labelSelected : null]}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
    top: 4,
    borderRadius: 14,
    backgroundColor: MeshipayBrand.border,
  },
  shadowSelected: {
    backgroundColor: MeshipayBrand.primary,
  },
  button: {
    backgroundColor: MeshipayBrand.cream,
    borderWidth: 3,
    borderColor: MeshipayBrand.border,
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 76,
  },
  buttonSelected: {
    backgroundColor: MeshipayBrand.primary,
  },
  buttonPressed: {
    transform: [{ translateY: 2 }],
  },
  label: {
    color: MeshipayBrand.border,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  labelSelected: {
    color: MeshipayBrand.border,
  },
});
