import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { NeoBrutalButton } from '@/components/ui/neo-brutal-button';
import { MeshipayBrand } from '@/constants/meshipay-brand';
import { pickTicketImage } from '@/features/tickets/ticket-image';
import type { TicketDraftInput } from '@/features/tickets/ticket-types';

const TEMPLATES: { label: string; draft: Partial<TicketDraftInput> }[] = [
  {
    label: 'CLUB GATE',
    draft: {
      eventName: 'Club Gate A',
      homeTeam: 'Arunachal FC',
      awayTeam: 'Hill United',
      venue: 'Community Ground',
      gate: '3A',
      seatLabel: 'General Admission',
      priceUsdt: '10.00',
      quantity: 20,
    },
  },
  {
    label: 'WATCH PARTY',
    draft: {
      eventName: 'Watch Party Night',
      homeTeam: 'National Squad',
      awayTeam: 'Rival XI',
      venue: 'Fan Zone',
      gate: 'VIP',
      seatLabel: 'Lounge',
      priceUsdt: '5.00',
      quantity: 50,
    },
  },
  {
    label: 'FINAL',
    draft: {
      eventName: 'Tournament Final',
      homeTeam: 'Meshipay FC',
      awayTeam: 'Cup Challengers',
      venue: 'Stadium Gate B',
      gate: 'B2',
      seatLabel: 'Lower Bowl',
      priceUsdt: '25.00',
      quantity: 10,
    },
  },
];

const DURATION_OPTIONS = [
  { label: '1H', hours: 1 },
  { label: '2H', hours: 2 },
  { label: '3H', hours: 3 },
];

function defaultDraft(): TicketDraftInput {
  const start = new Date();
  start.setHours(start.getHours() + 2, 0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return {
    eventName: '',
    homeTeam: '',
    awayTeam: '',
    venue: '',
    gate: '',
    seatLabel: '',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    priceUsdt: '10.00',
    quantity: 1,
    notes: '',
  };
}

function applyDuration(startAt: string, hours: number): string {
  const start = new Date(startAt);
  const end = new Date(start);
  end.setHours(end.getHours() + hours);
  return end.toISOString();
}

type TicketBuilderFormProps = {
  onSubmit: (draft: TicketDraftInput) => void;
  onDraftChange?: (draft: TicketDraftInput) => void;
  loading?: boolean;
  disabled?: boolean;
};

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  multiline?: boolean;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline ? fieldStyles.multiline : null]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={MeshipayBrand.muted}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

export function TicketBuilderForm({ onSubmit, onDraftChange, loading, disabled }: TicketBuilderFormProps) {
  const [draft, setDraft] = useState<TicketDraftInput>(defaultDraft);
  const [durationHours, setDurationHours] = useState(2);

  useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  const update = (patch: Partial<TicketDraftInput>) => {
    setDraft((current) => {
      const next = { ...current, ...patch };
      onDraftChange?.(next);
      return next;
    });
  };

  const setDuration = (hours: number) => {
    setDurationHours(hours);
    update({ endAt: applyDuration(draft.startAt, hours) });
  };

  const handlePickImage = async () => {
    const uri = await pickTicketImage();
    if (uri) {
      update({ imageUri: uri });
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.templatesLabel}>MATCHDAY TEMPLATES</Text>
      <View style={styles.templateRow}>
        {TEMPLATES.map((template) => (
          <Pressable
            key={template.label}
            accessibilityRole="button"
            onPress={() => {
              const next = { ...draft, ...template.draft };
              setDraft(next);
              onDraftChange?.(next);
            }}
            style={styles.templateChip}>
            <Text style={styles.templateChipText}>{template.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable accessibilityRole="button" onPress={handlePickImage} style={styles.imageBtn}>
        {draft.imageUri ? (
          <Image source={{ uri: draft.imageUri }} style={styles.imagePreview} contentFit="cover" />
        ) : (
          <Text style={styles.imageBtnText}>UPLOAD COVER IMAGE</Text>
        )}
      </Pressable>

      <Field label="EVENT NAME" value={draft.eventName} onChangeText={(v) => update({ eventName: v })} />
      <Field label="HOME TEAM" value={draft.homeTeam} onChangeText={(v) => update({ homeTeam: v })} />
      <Field label="AWAY TEAM" value={draft.awayTeam} onChangeText={(v) => update({ awayTeam: v })} />
      <Field label="VENUE" value={draft.venue} onChangeText={(v) => update({ venue: v })} />
      <Field label="GATE" value={draft.gate} onChangeText={(v) => update({ gate: v })} />
      <Field label="SECTION / SEAT" value={draft.seatLabel} onChangeText={(v) => update({ seatLabel: v })} />

      <Text style={fieldStyles.label}>DURATION</Text>
      <View style={styles.durationRow}>
        {DURATION_OPTIONS.map((option) => (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            onPress={() => setDuration(option.hours)}
            style={[
              styles.durationChip,
              durationHours === option.hours ? styles.durationChipActive : null,
            ]}>
            <Text
              style={[
                styles.durationChipText,
                durationHours === option.hours ? styles.durationChipTextActive : null,
              ]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Field
        label="PRICE (USDT)"
        value={draft.priceUsdt}
        onChangeText={(v) => update({ priceUsdt: v })}
        keyboardType="decimal-pad"
      />
      <Field
        label="QUANTITY"
        value={String(draft.quantity)}
        onChangeText={(v) => update({ quantity: Math.max(1, Number.parseInt(v, 10) || 1) })}
        keyboardType="number-pad"
      />
      <Field label="NOTES" value={draft.notes ?? ''} onChangeText={(v) => update({ notes: v })} multiline />

      <NeoBrutalButton
        label="GENERATE TICKET"
        disabled={disabled || loading}
        onPress={() => onSubmit(draft)}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    color: MeshipayBrand.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 2,
    borderColor: MeshipayBrand.border,
    borderRadius: 10,
    backgroundColor: MeshipayBrand.backgroundElevated,
    color: MeshipayBrand.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
});

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  templatesLabel: {
    color: MeshipayBrand.foreground,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  templateChip: {
    borderWidth: 2,
    borderColor: MeshipayBrand.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: MeshipayBrand.accentGreen,
  },
  templateChipText: {
    color: MeshipayBrand.foreground,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  imageBtn: {
    borderWidth: 2,
    borderColor: MeshipayBrand.border,
    borderRadius: 10,
    backgroundColor: MeshipayBrand.backgroundElevated,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  imageBtnText: {
    color: MeshipayBrand.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  imagePreview: {
    width: '100%',
    height: 140,
  },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  durationChip: {
    borderWidth: 2,
    borderColor: MeshipayBrand.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: MeshipayBrand.backgroundElevated,
  },
  durationChipActive: {
    backgroundColor: MeshipayBrand.primary,
  },
  durationChipText: {
    color: MeshipayBrand.foreground,
    fontSize: 12,
    fontWeight: '900',
  },
  durationChipTextActive: {
    color: MeshipayBrand.border,
  },
});
