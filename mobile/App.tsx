import { requestForegroundPermissionsAsync } from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { type ComponentRef, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TripMap from './TripMap';
import { stops } from './demoTrip';

export default function App() {
  const [tab, setTab] = useState<'organisation' | 'carte'>('organisation');
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [showActivities, setShowActivities] = useState(false);
  const [showPosition, setShowPosition] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const conversation = useRef<ComponentRef<typeof ScrollView>>(null);
  const next = stops[completed];

  function sendMessage() {
    const message = draft.trim();
    if (!message) return;
    setMessages((previous) => [...previous, message]);
    setDraft('');
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.page} edges={tab === 'carte' ? [] : undefined}>
        <StatusBar hidden={tab === 'carte'} style="dark" />
        <KeyboardAvoidingView
          style={styles.page}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {tab === 'organisation' && <View style={styles.header}>
            <Text style={styles.brand}>TravelBuddy</Text>
            <Text accessibilityRole="header" style={styles.heading}>Organisation</Text>
          </View>}

          {tab === 'organisation' ? (
            <>
              <ScrollView
                ref={conversation}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => {
                  if (messages.length > 0) conversation.current?.scrollToEnd();
                }}
              >
                <View style={styles.card}>
                  <Text style={styles.stopName}>Marrakech · Voyage de démonstration</Text>
                  {started ? (
                    <Text style={styles.muted}>Voyage en cours</Text>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      style={styles.button}
                      onPress={() => {
                        setStarted(true);
                        setTab('carte');
                      }}
                    >
                      <Text style={styles.buttonLabel}>Démarrer le voyage</Text>
                    </Pressable>
                  )}
                </View>
                {started && (
                  <>
                    <Pressable accessibilityRole="button" style={styles.button} onPress={async () => {
                      try {
                        const { granted } = await requestForegroundPermissionsAsync();
                        setShowPosition(granted);
                        setLocationMessage(granted ? 'Position activée sur la carte' : 'Autorise la localisation dans les réglages.');
                      } catch {
                        setLocationMessage('Localisation indisponible.');
                      }
                    }}>
                      <Text style={styles.buttonLabel}>Activer ma position sur la carte</Text>
                    </Pressable>
                    {locationMessage !== '' && <Text style={styles.muted}>{locationMessage}</Text>}
              <View style={styles.tripPanel}>
                <View style={styles.panelHeader}>
                  <Text accessibilityRole="header" style={styles.brand}>
                    {next ? `Étape ${completed + 1} sur ${stops.length}` : 'Toutes les étapes terminées'}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showActivities }}
                    onPress={() => setShowActivities((visible) => !visible)}
                    style={styles.activitiesButton}
                  >
                    <Text style={styles.brand}>{showActivities ? 'Masquer' : 'Activités'}</Text>
                  </Pressable>
                </View>
                <Text style={styles.stopName}>{next?.name ?? 'Journée terminée'}</Text>
                {next && (
                  <>
                    <Text style={styles.muted}>{next.time} · {next.detail}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setCompleted((count) => Math.min(count + 1, stops.length))}
                      style={styles.button}
                    >
                      <Text style={styles.buttonLabel}>Marquer comme terminée</Text>
                    </Pressable>
                  </>
                )}
                {showActivities && (
                  <ScrollView style={styles.activities}>
                    {stops.map((stop, index) => (
                      <View key={stop.name} style={styles.row}>
                        <Text style={styles.brand}>{stop.time}</Text>
                        <View style={styles.stop}>
                          <Text style={styles.stopName}>{stop.name}</Text>
                          <Text style={styles.muted}>{index < completed ? 'Terminée' : stop.detail}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
                  </>
                )}
                <Text style={styles.muted}>Chat de démonstration</Text>
                <View style={styles.card}>
                  <Text style={styles.stopName}>Parle-moi de ton voyage</Text>
                  <Text style={styles.muted}>Où veux-tu partir, combien de jours et avec quel budget ?</Text>
                </View>
                {messages.map((message, index) => (
                  <View key={index} style={styles.bubble}>
                    <Text style={styles.bubbleLabel}>{message}</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.composer}>
                <TextInput
                  accessibilityLabel="Ton message"
                  onChangeText={setDraft}
                  onSubmitEditing={sendMessage}
                  placeholder="Ton message…"
                  placeholderTextColor="#4e6258"
                  returnKeyType="send"
                  style={styles.input}
                  value={draft}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={!draft.trim()}
                  onPress={sendMessage}
                  style={[styles.button, !draft.trim() && styles.disabled]}
                >
                  <Text style={styles.buttonLabel}>Envoyer</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.mapScreen}>
              <TripMap completed={completed} traveling={started} showPosition={showPosition} />
              <SafeAreaView pointerEvents="box-none" edges={['top', 'left']} style={styles.mapBack}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retour à Organisation"
                  onPress={() => setTab('organisation')}
                  style={styles.backButton}
                >
                  <Text style={styles.buttonLabel}>‹</Text>
                </Pressable>
              </SafeAreaView>
            </View>
          )}

          {tab === 'organisation' && <View accessibilityRole="tablist" style={styles.navigation}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === 'organisation' }}
              onPress={() => setTab('organisation')}
              style={[styles.tab, tab === 'organisation' && styles.activeTab]}
            >
              <Text style={styles.tabLabel}>Organisation</Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === 'carte', disabled: !started }}
              disabled={!started}
              onPress={() => setTab('carte')}
              style={[styles.tab, tab === 'carte' && styles.activeTab, !started && styles.disabled]}
            >
              <Text style={styles.tabLabel}>Carte</Text>
              {!started && <Text style={styles.muted}>Au départ</Text>}
            </Pressable>
          </View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f7f4ec' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 4 },
  content: { paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  brand: { color: '#285b4b', fontSize: 14, fontWeight: '700' },
  heading: { color: '#19372e', fontSize: 32, fontWeight: '800' },
  muted: { color: '#4e6258', fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 8 },
  mapScreen: { flex: 1 },
  mapBack: { position: 'absolute', top: 12, left: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#19372e', alignItems: 'center', justifyContent: 'center' },
  tripPanel: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingBottom: 12, paddingTop: 4, gap: 4 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  activitiesButton: { paddingHorizontal: 8, minHeight: 44, justifyContent: 'center' },
  activities: { maxHeight: 126 },
  row: { flexDirection: 'row', gap: 14, paddingVertical: 6 },
  stop: { flex: 1 },
  stopName: { color: '#19372e', fontSize: 16, fontWeight: '700' },
  button: { backgroundColor: '#285b4b', borderRadius: 12, padding: 12, justifyContent: 'center' },
  buttonLabel: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  bubble: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: '#285b4b', borderRadius: 16, padding: 12 },
  bubbleLabel: { color: '#fff', fontSize: 15 },
  composer: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 10 },
  input: { flex: 1, minWidth: 0, backgroundColor: '#fff', borderRadius: 12, color: '#19372e', paddingHorizontal: 12, paddingVertical: 10 },
  navigation: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#bfcac0' },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 4 },
  activeTab: { backgroundColor: '#d9e7db' },
  tabLabel: { color: '#19372e', fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.65 },
});
