import { Accuracy, getCurrentPositionAsync, requestForegroundPermissionsAsync, watchPositionAsync, type LocationObjectCoords } from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TripMap, { type WalkingRoute } from './TripMap';
import { stops } from './demoTrip';
import { fetchRoute, type RouteProfile } from './mapping/routing';
import { formatDistance, getGuidance } from './mapping/guidance';

export default function App() {
  const [tab, setTab] = useState<'organisation' | 'carte'>('organisation');
  const [mapDetailsOpen, setMapDetailsOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [walkingRoute, setWalkingRoute] = useState<{ stopIndex: number; profile: RouteProfile; route: WalkingRoute }>();
  const [routeError, setRouteError] = useState<{ stopIndex: number; message: string }>();
  const [loadingProfile, setLoadingProfile] = useState<RouteProfile>();
  const [routeProfile, setRouteProfile] = useState<RouteProfile>('driving');
  const [guiding, setGuiding] = useState(false);
  const [guidancePosition, setGuidancePosition] = useState<LocationObjectCoords>();
  const [guidanceError, setGuidanceError] = useState(false);
  const routeRequestInProgress = useRef(false);
  const lastRouteRequest = useRef(0);
  const [showPosition, setShowPosition] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const next = stops[completed];
  const activeRoute = walkingRoute?.stopIndex === completed && walkingRoute.profile === routeProfile
    ? walkingRoute.route : undefined;
  const liveGuidance = guiding && activeRoute && guidancePosition ? getGuidance(activeRoute, guidancePosition) : undefined;
  const routeSummary = activeRoute
    ? `${Math.max(1, Math.round(activeRoute.duration / 60))} min ${routeProfile === 'driving' ? 'en voiture' : 'à pied'} · ${formatDistance(activeRoute.distance)}`
    : undefined;

  function completeCurrentStop() {
    if (!next) return;
    setGuiding(false);
    setCompleted((count) => count === completed ? count + 1 : count);
  }

  useEffect(() => {
    if (!guiding) return;
    let stopped = false;
    const subscription = watchPositionAsync(
      { accuracy: Accuracy.High, distanceInterval: 4, timeInterval: 1000 },
      ({ coords }) => {
        if (!stopped) {
          setGuidancePosition(coords);
          setGuidanceError(false);
        }
      },
      () => { if (!stopped) setGuidanceError(true); },
    );
    void subscription.catch(() => { if (!stopped) setGuidanceError(true); });
    return () => {
      stopped = true;
      void subscription.then((watch) => watch.remove(), () => {});
    };
  }, [guiding]);

  async function enablePosition() {
    try {
      const { granted } = await requestForegroundPermissionsAsync();
      setShowPosition(granted);
      setLocationMessage(granted ? '' : 'Autorise la localisation dans les réglages.');
    } catch {
      setLocationMessage('Localisation indisponible.');
    }
  }

  async function showDirections(profile: RouteProfile) {
    if (!next || routeRequestInProgress.current) return;
    if (Platform.OS !== 'web' && Date.now() - lastRouteRequest.current < 1000) return;
    setRouteProfile(profile);
    if (Platform.OS === 'web') return;
    routeRequestInProgress.current = true;
    setLoadingProfile(profile);
    setRouteError(undefined);

    try {
      const { granted } = await requestForegroundPermissionsAsync();
      if (!granted) {
        setRouteError({ stopIndex: completed, message: 'Autorise la localisation pour calculer le trajet.' });
        return;
      }

      const { coords } = await getCurrentPositionAsync();
      lastRouteRequest.current = Date.now();
      const route = await fetchRoute(coords, next.coordinate, profile);
      setWalkingRoute({ stopIndex: completed, profile, route });
      setShowPosition(true);
      setLocationMessage('');
    } catch {
      setRouteError({ stopIndex: completed, message: 'Trajet indisponible depuis ta position. Vérifie ta connexion et réessaie.' });
    } finally {
      routeRequestInProgress.current = false;
      setLoadingProfile(undefined);
    }
  }

  function openTrip() {
    setStarted(true);
    setTab('carte');
    if (!started && next) {
      setMapDetailsOpen(true);
      if (Platform.OS !== 'web') void showDirections(routeProfile);
    }
  }

  function startGuidance() {
    if (!activeRoute) return;
    setGuidancePosition(undefined);
    setGuidanceError(false);
    setGuiding(true);
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.page} edges={tab === 'carte' ? ['left', 'right', 'bottom'] : undefined}>
        <StatusBar style={tab === 'carte' ? 'light' : 'dark'} />
        <KeyboardAvoidingView style={styles.page} behavior={tab === 'carte' && Platform.OS === 'ios' ? 'padding' : undefined}>
          {tab === 'organisation' ? (
            <ScrollView style={styles.organisation} contentContainerStyle={styles.content}>
              <Text style={styles.wordmark}>TravelBuddy</Text>
              <View style={styles.hero}>
                <Text style={styles.heroMeta}>Maroc · Voyage de démonstration</Text>
                <Text accessibilityRole="header" style={styles.heading}>Marrakech</Text>
                <View accessible accessibilityRole="progressbar"
                  accessibilityLabel="Progression du voyage"
                  accessibilityValue={{ min: 0, now: completed, max: stops.length }} style={styles.progress}>
                  <Text style={styles.heroMeta}>{completed} sur {stops.length} étapes terminées</Text>
                  <View style={styles.progressTrack}>
                    {stops.map((stop, index) => (
                      <View key={stop.name} style={[styles.progressSegment, index < completed && styles.progressCompleted]} />
                    ))}
                  </View>
                </View>
                <Pressable accessibilityRole="button" style={({ pressed }) => [styles.button, styles.heroButton, pressed && styles.pressed]}
                  onPress={openTrip}>
                  <Text style={styles.heroButtonLabel}>{started ? 'Ouvrir la carte' : 'Démarrer le voyage'}</Text>
                </Pressable>
              </View>

              <View style={styles.agenda}>
                <Text accessibilityRole="header" style={styles.sectionHeading}>Programme</Text>
                {stops.map((stop, index) => {
                  const current = started && index === completed;
                  return (
                    <View key={stop.name} style={[styles.agendaRow, current && styles.currentRow]}>
                      <Text style={styles.time}>{stop.time}</Text>
                      <View style={styles.stop}>
                        <Text style={styles.stopName}>{stop.name}</Text>
                        <Text style={styles.muted}>{stop.detail}</Text>
                        {index < completed && <Text style={styles.brand}>Terminée</Text>}
                        {current && (
                          <>
                            <Text style={styles.brand}>Prochaine étape</Text>
                            <Pressable accessibilityRole="button" onPress={completeCurrentStop} style={styles.inlineAction}>
                              <Text style={styles.brand}>Marquer comme terminée</Text>
                            </Pressable>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
                {started && !next && <Text accessibilityLiveRegion="polite" style={styles.brand}>Toutes les étapes sont terminées.</Text>}
                {started && !showPosition && (
                  <Pressable accessibilityRole="button" onPress={() => void enablePosition()} style={styles.inlineAction}>
                    <Text style={styles.brand}>Afficher ma position sur la carte</Text>
                  </Pressable>
                  )}
                {!showPosition && locationMessage !== '' && (
                  <Text accessibilityLiveRegion="polite" style={styles.error}>{locationMessage}</Text>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.mapScreen}>
              <TripMap completed={completed} showPosition={showPosition} routeDestination={mapDetailsOpen ? next?.name : undefined}
                onPositionEnabled={() => setShowPosition(true)} walkingRoute={activeRoute}
                guidance={guiding ? {
                  instruction: guidanceError ? 'Signal GPS indisponible' : liveGuidance?.instruction ?? 'Recherche de votre position…',
                  detail: guidanceError ? '' : liveGuidance?.detail ?? '',
                  position: guidancePosition,
                } : undefined} />
              {guiding ? (
                <View style={styles.mapStopCard}>
                  <View style={styles.mapStopToggle}>
                    <View style={styles.mapStopSummary}>
                      <Text style={styles.stopName}>{next?.name}</Text>
                      {liveGuidance && <Text style={styles.brand}>{liveGuidance.minutes} min · {formatDistance(liveGuidance.remaining)} restantes</Text>}
                    </View>
                    <Pressable accessibilityRole="button" style={styles.inlineAction} onPress={() => setGuiding(false)}>
                      <Text style={styles.brand}>Quitter</Text>
                    </Pressable>
                  </View>
                  {liveGuidance?.arrived && (
                    <Pressable accessibilityRole="button" style={styles.inlineAction} onPress={completeCurrentStop}>
                      <Text style={styles.brand}>Marquer comme terminée</Text>
                    </Pressable>
                  )}
                  {liveGuidance?.offRoute && (
                    <Pressable accessibilityRole="button" disabled={loadingProfile !== undefined} style={styles.inlineAction} onPress={() => void showDirections(routeProfile)}>
                      <Text style={styles.brand}>{loadingProfile ? 'Calcul en cours…' : 'Recalculer l’itinéraire'}</Text>
                    </Pressable>
                  )}
                  {routeError?.stopIndex === completed && <Text accessibilityLiveRegion="polite" style={styles.error}>{routeError.message}</Text>}
                </View>
              ) : <View style={styles.mapStopCard}>
                {next ? (
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: mapDetailsOpen }}
                    accessibilityHint={mapDetailsOpen ? 'Masquer les actions de cette étape' : 'Afficher les actions de cette étape'}
                    style={styles.mapStopToggle} onPress={() => setMapDetailsOpen((open) => !open)}>
                    <View style={styles.mapStopSummary}>
                      <Text style={styles.brand}>{next.time} · Étape {completed + 1}/{stops.length}</Text>
                      <Text style={styles.stopName}>{next.name}</Text>
                      {routeSummary && <Text accessibilityLiveRegion="polite" style={styles.muted}>{routeSummary}</Text>}
                    </View>
                    <Text style={styles.mapStopToggleLabel}>{mapDetailsOpen ? 'Réduire' : 'Itinéraire'}</Text>
                  </Pressable>
                ) : (
                  <Text accessibilityLiveRegion="polite" style={styles.brand}>Toutes les étapes terminées</Text>
                )}
                {next && mapDetailsOpen && (
                  <>
                    <Text style={styles.muted}>{next.detail}</Text>
                    {routeError?.stopIndex === completed && (
                      <Text accessibilityLiveRegion="polite" style={styles.error}>{routeError.message}</Text>
                    )}
                    <View style={styles.mapActions}>
                        {(['driving', 'walking'] as const).map((profile) => {
                          const label = profile === 'walking' ? 'À pied' : 'En voiture';
                          const busy = loadingProfile === profile;
                          const selected = routeProfile === profile;
                          return (
                            <Pressable key={profile} accessibilityRole="button" accessibilityLabel={label}
                              accessibilityState={{ busy, selected, disabled: loadingProfile !== undefined }}
                              disabled={loadingProfile !== undefined} onPress={() => void showDirections(profile)}
                              style={({ pressed }) => [styles.button, styles.directionsButton, selected && styles.selectedDirection, pressed && styles.pressed]}>
                              {busy && <ActivityIndicator size="small" color="#285b4b" />}
                              <Text style={styles.brand}>{label}</Text>
                            </Pressable>
                          );
                        })}
                    </View>
                    {loadingProfile && (
                      <Text accessibilityLiveRegion="polite" style={styles.muted}>Calcul de l’itinéraire en cours…</Text>
                    )}
                    {!!activeRoute && !loadingProfile && (
                      <Pressable accessibilityRole="button"
                        onPress={startGuidance} style={({ pressed }) => [styles.button, styles.guidanceButton, pressed && styles.pressed]}>
                        <Text style={styles.guidanceLabel}>Démarrer le guidage</Text>
                      </Pressable>
                    )}
                    <Pressable accessibilityRole="button" onPress={completeCurrentStop} style={styles.inlineAction}>
                      <Text style={styles.brand}>Marquer comme terminée</Text>
                    </Pressable>
                  </>
                )}
              </View>}
            </View>
          )}

          <View accessibilityRole="tablist" style={styles.navigation}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === 'organisation' }}
              onPress={() => {
                setGuiding(false);
                setTab('organisation');
              }}
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
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f7f4ec' },
  organisation: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 18, width: '100%', maxWidth: 600, alignSelf: 'center' },
  wordmark: { color: '#19372e', fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  hero: { backgroundColor: '#19372e', borderRadius: 24, padding: 22, gap: 12 },
  heroMeta: { color: '#e3ebdc', fontSize: 14, fontWeight: '600' },
  heading: { color: '#fff9ee', fontSize: 38, fontWeight: '800', letterSpacing: -1.2 },
  progress: { gap: 8, paddingVertical: 4 },
  progressTrack: { flexDirection: 'row', gap: 5 },
  progressSegment: { flex: 1, height: 6, borderRadius: 4, backgroundColor: '#55766b' },
  progressCompleted: { backgroundColor: '#f4c991' },
  heroButton: { backgroundColor: '#f4c991', alignSelf: 'flex-start' },
  heroButtonLabel: { color: '#19372e', fontWeight: '800', textAlign: 'center' },
  pressed: { opacity: 0.75 },
  brand: { color: '#285b4b', fontSize: 14, fontWeight: '700' },
  muted: { color: '#4e6258', fontSize: 14, lineHeight: 21 },
  error: { color: '#8e392a', fontSize: 14, lineHeight: 20 },
  agenda: { gap: 8 },
  sectionHeading: { color: '#19372e', fontSize: 23, fontWeight: '800', marginBottom: 4 },
  agendaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderWidth: 1, borderColor: '#e4e5dc', backgroundColor: '#fff', borderRadius: 16, padding: 14 },
  currentRow: { backgroundColor: '#e7efe5', borderColor: '#a6c0ad' },
  time: { color: '#285b4b', fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '700', paddingTop: 2 },
  stop: { flex: 1, gap: 3 },
  inlineAction: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingVertical: 8 },
  mapScreen: { flex: 1 },
  mapStopCard: { backgroundColor: '#fffdf8', paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  mapStopToggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  mapStopSummary: { flex: 1, gap: 2 },
  mapStopToggleLabel: { color: '#fff', backgroundColor: '#285b4b', fontWeight: '700', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, overflow: 'hidden' },
  mapActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  directionsButton: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eef3ed', borderWidth: 1, borderColor: '#d7e5d9' },
  selectedDirection: { backgroundColor: '#d9e7db', borderColor: '#285b4b' },
  guidanceButton: { backgroundColor: '#19372e' },
  guidanceLabel: { color: '#fff9ee', fontWeight: '800', textAlign: 'center' },
  stopName: { color: '#19372e', fontSize: 16, fontWeight: '700' },
  button: { minHeight: 46, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' },
  navigation: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 6, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ccd6cf' },
  tab: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 4 },
  activeTab: { backgroundColor: '#d9e7db' },
  tabLabel: { color: '#19372e', fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.55 },
});
