import { Pressable, StyleSheet, Text, View } from 'react-native';

const tabs = [
  { id: 'organisation', label: 'Organisation' },
  { id: 'carte', label: 'Carte' },
  { id: 'chat', label: 'Chat' },
  { id: 'settings', label: 'Réglages' },
] as const;

export type NavigationTab = typeof tabs[number]['id'];

function TabIcon({ tab, color }: { tab: NavigationTab; color: string }) {
  const stroke = { borderColor: color };
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.icon}>
      {tab === 'organisation' && (
        <>
          <View style={[styles.roof, stroke]} />
          <View style={[styles.house, stroke]} />
          <View style={[styles.door, { backgroundColor: color }]} />
        </>
      )}
      {tab === 'carte' && (
        <View style={styles.map}>
          <View style={[styles.mapPanel, styles.mapLeft, stroke]} />
          <View style={[styles.mapPanel, styles.mapMiddle, stroke]} />
          <View style={[styles.mapPanel, styles.mapLeft, stroke]} />
        </View>
      )}
      {tab === 'chat' && (
        <>
          <View style={[styles.bubble, stroke]}>
            {[0, 1, 2].map((dot) => <View key={dot} style={[styles.dot, { backgroundColor: color }]} />)}
          </View>
          <View style={[styles.tail, stroke]} />
        </>
      )}
      {tab === 'settings' && (
        <View style={styles.sliders}>
          {[0, 1, 2].map((line) => (
            <View key={line} style={[styles.sliderLine, { backgroundColor: color }]}>
              <View style={[styles.knob, stroke, { left: line === 1 ? 12 : 4 }]} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function BottomNavigation({ selected, onSelect, mapAvailable }: {
  selected: NavigationTab;
  onSelect: (tab: NavigationTab) => void;
  mapAvailable: boolean;
}) {
  return (
    <View style={styles.container}>
      <View accessibilityRole="tablist" style={styles.bar}>
        {tabs.map(({ id, label }) => {
          const active = selected === id;
          const disabled = id === 'carte' && !mapAvailable;
          const color = active ? '#19372e' : '#53665e';
          return (
            <Pressable key={id} accessibilityRole="tab" accessibilityLabel={label}
              accessibilityState={{ selected: active, disabled }}
              accessibilityHint={disabled ? 'Démarrez le voyage dans Organisation pour ouvrir la carte.' : undefined}
              disabled={disabled} onPress={() => onSelect(id)}
              style={({ pressed }) => [styles.tab, active && styles.active, disabled && styles.disabled, pressed && styles.pressed]}>
              <TabIcon tab={id} color={color} />
              <Text style={[styles.label, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  bar: { flexDirection: 'row', width: '100%', maxWidth: 480, alignSelf: 'center', gap: 3, padding: 5,
    borderRadius: 32, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#dce5dc',
    shadowColor: '#285b4b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  tab: { flex: 1, minHeight: 54, paddingVertical: 7, paddingHorizontal: 2, gap: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 26 },
  active: { backgroundColor: '#d9e7db' },
  label: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.7 },
  icon: { width: 24, height: 23, alignItems: 'center', justifyContent: 'center' },
  roof: { position: 'absolute', top: 3, width: 13, height: 13, borderTopWidth: 2, borderLeftWidth: 2, transform: [{ rotate: '45deg' }] },
  house: { position: 'absolute', bottom: 1, width: 15, height: 12, borderWidth: 2, borderTopWidth: 0, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  door: { position: 'absolute', bottom: 1, width: 4, height: 7, borderTopLeftRadius: 1, borderTopRightRadius: 1 },
  map: { flexDirection: 'row' },
  mapPanel: { width: 7, height: 17, borderWidth: 1.5 },
  mapLeft: { transform: [{ skewY: '-16deg' }] },
  mapMiddle: { transform: [{ skewY: '16deg' }] },
  bubble: { width: 22, height: 16, borderWidth: 1.8, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  dot: { width: 2, height: 2, borderRadius: 1 },
  tail: { position: 'absolute', bottom: 1, left: 5, width: 5, height: 5, borderLeftWidth: 1.8, transform: [{ skewY: '-35deg' }] },
  sliders: { gap: 5 },
  sliderLine: { width: 22, height: 2, borderRadius: 1 },
  knob: { position: 'absolute', top: -2, width: 6, height: 6, borderWidth: 1.5, borderRadius: 3, backgroundColor: '#fffdf8' },
});
