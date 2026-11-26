import { useCallback, useState } from 'react';
import { NativeModules, Platform, Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { stops } from './demoTrip';
import ExplorationMap from './mapping/ExplorationMap';
import { resolveViewerUrl } from './mapping/bridge';
import LegacyMap from './mapping/LegacyMap';
import type { TripMapProps } from './TripMap';

const mapboxConfigured = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.startsWith('pk.');
// RNMapbox throws during import if the installed native binary does not include it.
const NavigationMap: typeof import('./mapping/NavigationMap').default | undefined =
  mapboxConfigured && NativeModules.RNMBXModule != null
    ? require('./mapping/NavigationMap').default
    : undefined;
const viewerUrl = resolveViewerUrl(
  process.env.EXPO_PUBLIC_CESIUM_VIEWER_URL, __DEV__, NativeModules.SourceCode?.scriptURL,
);
const fallbackConfigured = Platform.OS === 'ios' || Boolean(process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY);

export default function TripMap(props: TripMapProps) {
  const [exploring, setExploring] = useState(false);
  const [routeAtExplorationStart, setRouteAtExplorationStart] = useState<TripMapProps['walkingRoute']>();
  const [flat, setFlat] = useState(false);
  const [mapboxFailed, setMapboxFailed] = useState(false);
  const [explorationMessage, setExplorationMessage] = useState('');
  const [selection, setSelection] = useState<{ index: number; progress: number; route: TripMapProps['walkingRoute'] }>();
  const [query, setQuery] = useState('');
  const dark = useColorScheme() === 'dark';
  const selected = selection?.progress === props.completed && selection.route === props.walkingRoute
    ? selection.index : Math.min(props.completed, stops.length - 1);
  const select = (index: number) => setSelection({ index, progress: props.completed, route: props.walkingRoute });
  const stop = stops[selected];
  const canExplore = viewerUrl !== undefined;
  const canNavigate = NavigationMap !== undefined && !mapboxFailed;
  const explorationVisible = exploring && props.walkingRoute === routeAtExplorationStart;
  const search = query.trim().toLocaleLowerCase();
  const matches = search ? stops.map((place, index) => ({ place, index }))
    .filter(({ place }) => place.name.toLocaleLowerCase().includes(search)) : [];
  const explorationFailure = useCallback(() => {
    setExplorationMessage('Carte 3D indisponible. Vérifie le serveur local et le Wi-Fi, puis réessaie.');
    setExploring(false);
    setFlat(true);
  }, []);
  const mapboxFailure = useCallback(() => setMapboxFailed(true), []);

  return (
    <View style={styles.frame}>
      {explorationVisible && canExplore ? (
        <ExplorationMap url={viewerUrl} destination={stop.coordinate} flat={flat} onFailure={explorationFailure} />
      ) : NavigationMap && canNavigate ? (
        <NavigationMap {...props} selected={selected} onSelect={select} flat={flat} dark={dark} onFailure={mapboxFailure} />
      ) : fallbackConfigured ? (
        <LegacyMap {...props} />
      ) : (
        <View style={styles.unavailable}>
          <Text style={styles.label}>{mapboxFailed ? 'Carte indisponible. Vérifie la connexion et réessaie.' : 'Carte indisponible dans ce build.'}</Text>
          {mapboxFailed && <Pressable accessibilityRole="button" style={styles.control} onPress={() => setMapboxFailed(false)}><Text>Réessayer</Text></Pressable>}
        </View>
      )}
      <SafeAreaView pointerEvents="box-none" edges={['top', 'left']} style={styles.controls}>
        <View style={styles.row}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: !explorationVisible }} style={styles.control} onPress={() => {
                setExploring(false);
                setExplorationMessage('');
              }}>
                <Text style={styles.label}>Navigation</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: explorationVisible }} style={styles.control} onPress={() => {
                if (!canExplore) {
                  setExplorationMessage('Adresse du viewer 3D manquante. Redémarre Expo depuis le dossier mobile.');
                  return;
                }
                setExplorationMessage('');
                setRouteAtExplorationStart(props.walkingRoute);
                setExploring(true);
              }}>
                <Text style={styles.label}>Explorer en 3D</Text>
              </Pressable>
          {(explorationVisible || canNavigate) && (
            <Pressable accessibilityRole="button" style={styles.control} onPress={() => setFlat((value) => !value)}>
              <Text style={styles.label}>{flat ? 'Vue 3D' : 'Vue 2D'}</Text>
            </Pressable>
          )}
        </View>
        {(explorationVisible || canNavigate) && (
          <View style={styles.search}>
            <TextInput accessibilityLabel="Chercher une étape du voyage" placeholder="Chercher une étape"
              placeholderTextColor="#4e6258" autoCorrect={false} value={query} onChangeText={setQuery} style={styles.control} />
            {matches.map(({ place, index }) => (
              <Pressable key={place.name} accessibilityRole="button" style={styles.control} onPress={() => {
                select(index);
                setQuery('');
              }}>
                <Text style={styles.label}>{place.name}</Text>
              </Pressable>
            ))}
            {search && matches.length === 0 && <Text style={styles.control}>Aucune étape trouvée</Text>}
          </View>
        )}
        {explorationMessage !== '' && <Text style={styles.control} accessibilityLiveRegion="polite">{explorationMessage}</Text>}
      </SafeAreaView>
      {(explorationVisible || (canNavigate && selected !== props.completed)) && (
        <View style={styles.places}>
          <Pressable accessibilityLabel="Destination précédente" accessibilityRole="button" disabled={selected === 0} onPress={() => select(selected - 1)} style={styles.control}><Text>‹</Text></Pressable>
          <Text style={[styles.control, styles.place]}>{stop.name}</Text>
          <Pressable accessibilityLabel="Destination suivante" accessibilityRole="button" disabled={selected === stops.length - 1} onPress={() => select(selected + 1)} style={styles.control}><Text>›</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  unavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6ebe2', padding: 18, gap: 8 },
  controls: { position: 'absolute', top: 8, left: 8, right: 8, gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  search: { gap: 2 },
  control: { backgroundColor: '#fff', borderRadius: 12, minHeight: 44, padding: 12, justifyContent: 'center' },
  label: { color: '#19372e', fontWeight: '700' },
  places: { position: 'absolute', bottom: 36, right: 12, left: 12, flexDirection: 'row', gap: 4 },
  place: { flex: 1, color: '#19372e', textAlign: 'center' },
});
