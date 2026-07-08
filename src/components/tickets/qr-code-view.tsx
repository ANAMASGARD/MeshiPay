import QRCodeLib from 'qrcode';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { MeshipayBrand } from '@/constants/meshipay-brand';

type QrCodeViewProps = {
  value: string;
  size?: number;
};

function buildMatrix(value: string): boolean[][] {
  try {
    const qr = QRCodeLib.create(value, { errorCorrectionLevel: 'M' });
    const gridSize = qr.modules.size;
    const next: boolean[][] = [];
    for (let row = 0; row < gridSize; row += 1) {
      const cells: boolean[] = [];
      for (let col = 0; col < gridSize; col += 1) {
        cells.push(Boolean(qr.modules.get(row, col)));
      }
      next.push(cells);
    }
    return next;
  } catch {
    return [];
  }
}

export function QrCodeView({ value, size = 160 }: QrCodeViewProps) {
  const matrix = useMemo(() => buildMatrix(value), [value]);

  const cellSize = useMemo(() => {
    if (matrix.length === 0) {
      return 0;
    }
    return size / matrix.length;
  }, [matrix.length, size]);

  if (matrix.length === 0) {
    return <View style={[styles.wrap, { width: size, height: size }]} />;
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {matrix.map((row, rowIndex) =>
        row.map((filled, colIndex) => (
          <View
            key={`${rowIndex}-${colIndex}`}
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: filled ? MeshipayBrand.border : MeshipayBrand.cream,
            }}
          />
        )),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: MeshipayBrand.cream,
    borderWidth: 2,
    borderColor: MeshipayBrand.border,
    overflow: 'hidden',
  },
});
