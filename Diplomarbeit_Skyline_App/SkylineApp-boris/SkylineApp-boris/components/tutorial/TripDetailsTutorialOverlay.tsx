import React, { useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
  onClose: () => void;
};

const { width: W, height: H } = Dimensions.get('window');

export default function TripDetailsTutorialOverlay({ onClose }: Props) {
  const [step, setStep] = useState(0);

  const steps = useMemo(() => {
    return [
      {
        title: 'Trip Details – quick tour',
        body: 'This is your trip hub. You can add documents, notes, and checklists here.',
        anchor: { x: W * 0.5, y: 130 },
      },
      {
        title: 'Add documents',
        body: 'Open the Documents tab and upload your boarding pass / booking confirmation. This helps a lot when you are offline at the airport.',
        anchor: { x: W * 0.75, y: 120 },
      },
      {
        title: 'Notes + reminders',
        body: 'Use Notes to save important info (gate, terminal, meeting). You can also set reminders for notes.',
        anchor: { x: W * 0.55, y: 120 },
      },
      {
        title: 'Checklists',
        body: 'Use Checklists for packing / business tasks. Tap the + button to create items.',
        anchor: { x: W * 0.35, y: 120 },
      },
      {
        title: 'Done',
        body: 'That’s it. You can always come back and fill details later.',
        anchor: { x: W * 0.5, y: H * 0.75 },
      },
    ];
  }, []);

  const s = steps[Math.min(step, steps.length - 1)];

  const next = () => {
    if (step >= steps.length - 1) onClose();
    else setStep((v) => v + 1);
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.dim} pointerEvents="none" />

      {/* simple "arrow" marker */}
      <View style={[styles.pin, { left: s.anchor.x - 10, top: s.anchor.y - 10 }]} pointerEvents="none" />

      <View style={styles.cardWrap} pointerEvents="box-none">
        <LinearGradient colors={['rgba(30,30,30,0.98)', 'rgba(18,18,18,0.95)']} style={styles.card}>
          <View style={styles.header}>
            <View style={styles.icon}>
              <MaterialIcons name="tips-and-updates" size={18} color="#ff1900" />
            </View>
            <Text style={styles.title}>{s.title}</Text>
          </View>
          <Text style={styles.body}>{s.body}</Text>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>Skip</Text>
            </Pressable>
            <Pressable onPress={next} style={styles.btnPrimary}>
              <Text style={styles.btnPrimaryText}>{step >= steps.length - 1 ? 'Finish' : 'Next'}</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.70)' },
  pin: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff1900',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  cardWrap: { position: 'absolute', left: 18, right: 18, bottom: 28 },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,25,0,0.12)',
  },
  title: { color: '#fff', fontFamily: 'Nexa-Heavy', fontSize: 16 },
  body: { color: 'rgba(255,255,255,0.75)', fontFamily: 'Nexa-ExtraLight', lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  btnSecondary: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnSecondaryText: { color: '#fff', fontFamily: 'Nexa-Heavy' },
  btnPrimary: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff1900',
  },
  btnPrimaryText: { color: '#fff', fontFamily: 'Nexa-Heavy' },
});


