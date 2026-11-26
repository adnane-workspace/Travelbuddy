import { isRunningInExpoGo } from 'expo';
import { useCallback, useState } from 'react';
import { Keyboard, NativeModules, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExplorationMap from './mapping/ExplorationMap';
import { resolveViewerUrl } from './mapping/bridge';
import LegacyMap from './mapping/LegacyMap';
import type { TripMapProps } from './TripMap';

const viewerUrl = resolveViewerUrl(
  process.env.EXPO_PUBLIC_CESIUM_VIEWER_URL, __DEV__, NativeModules.SourceCode?.scriptURL,
);
const expoGo = isRunningInExpoGo();
const nativeGoogle = Platform.OS === 'android'
  ? expoGo || Boolean(process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY)
  : !expoGo && Boolean(process.env.EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY);
const nativeMapAvailable = Platform.OS === 'ios' || nativeGoogle;
const mapboxConfigured = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.startsWith('pk.');
// RNMapbox requires its native module and is only used without a native map.
const NavigationMap: typeof import('./mapping/NavigationMap').default | undefined =
  !nativeMapAvailable && mapboxConfigured && NativeModules.RNMBXModule != null
    ? require('./mapping/NavigationMap').default
    : undefined;

export default function TripMap(props: TripMapProps) {
  const { stops } = props;
  const [exploring, setExploring] = useState(false);
  const [routeAtExplorationStart, setRouteAtExplorationStart] = useState<TripMapProps['walkingRoute']>();
  const [flat, setFlat] = useState(true);
  const [mapboxFailed, setMapboxFailed] = useState(false);
  const [explorationMessage, setExplorationMessage] = useState('');
  const [selection, setSelection] = useState<{ index: number; progress: number; route: TripMapProps['walkingRoute'] }>();
  const [query, setQuery] = useState('');
  const selected = !props.routeDestination && selection?.progress === props.completed && selection.route === props.walkingRoute
    ? selection.index : Math.min(props.completed, stops.length - 1);
  const select = (index: number) => setSelection({ index, progress: props.completed, route: props.walkingRoute });
  const stop = stops[selected];
  const canExplore = viewerUrl !== undefined;
  const ActiveNavigationMap = mapboxFailed ? undefined : NavigationMap;
  const explorationVisible = !props.routeDestination && exploring && props.walkingRoute === routeAtExplorationStart;
  const mapControlsVisible = explorationVisible || nativeMapAvailable || ActiveNavigationMap !== undefined;
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
        <ExplorationMap url={viewerUrl} destination={stop.coordinate} flat={flat} onFailure={explorationFailure}
          onPlaceSelected={(place) => {
            setExploring(false);
            setSelection(undefined);
            props.onPlaceSelected(place);
          }} />
      ) : nativeMapAvailable ? (
        <LegacyMap {...props} google={nativeGoogle} flat={flat} selected={selected} onSelect={select} />
      ) : ActiveNavigationMap ? (
        <ActiveNavigationMap {...props} selected={selected} onSelect={select} flat={flat} dark={false} onFailure={mapboxFailure} />
      ) : (
        <View style={styles.unavailable}>
          <Text style={styles.label}>{mapboxFailed ? 'Carte indisponible. Vérifie la connexion et réessaie.' : 'Carte indisponible dans ce build.'}</Text>
          {mapboxFailed && <Pressable accessibilityRole="button" style={styles.control} onPress={() => setMapboxFailed(false)}><Text>Réessayer</Text></Pressable>}
        </View>
      )}
      {props.guidance ? (
        <SafeAreaView pointerEvents="box-none" edges={['top', 'left', 'right']} style={styles.controls}>
          <View style={styles.guidanceHeader}>
            <Text accessible={false} style={styles.guidanceArrow}>{props.guidance.arrow ?? '…'}</Text>
            <View style={styles.guidanceText}>
            <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.guidanceInstruction}>{props.guidance.instruction}</Text>
            {props.guidance.detail !== '' && <Text style={styles.guidanceDetail}>{props.guidance.detail}</Text>}
            </View>
          </View>
          {props.guidance.following && <Text style={styles.followingInstruction}>{props.guidance.following}</Text>}
        </SafeAreaView>
      ) : props.routeDestination ? (
        <SafeAreaView pointerEvents="box-none" edges={['top', 'left', 'right']} style={styles.controls}>
          <View style={styles.routeHeader}>
            <View style={styles.routeHeaderRow}>
              <View style={styles.originDot} />
              <Text style={styles.routeOrigin}>Votre position</Text>
            </View>
            <View style={[styles.routeHeaderRow, styles.routeDestinationRow]}>
              <View style={styles.destinationDot} />
              <Text accessibilityRole="header" style={styles.routeDestination}>{props.routeDestination}</Text>
            </View>
          </View>
        </SafeAreaView>
      ) : (
      <SafeAreaView pointerEvents="box-none" edges={['top', 'left', 'right']} style={styles.controls}>
        {mapControlsVisible && (
          <View style={styles.searchBar}>
            <View importantForAccessibility="no" style={styles.searchIcon} />
            <TextInput accessibilityLabel="Rechercher une étape du voyage" placeholder="Rechercher une étape"
              placeholderTextColor="#53665e" autoCorrect={false} value={query} onChangeText={setQuery}
              returnKeyType="search" style={styles.searchInput} />
            {query.length > 0 && (
              <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" style={styles.clear} onPress={() => setQuery('')}>
                <Text style={styles.clearLabel}>×</Text>
              </Pressable>
            )}
          </View>
        )}
        <View pointerEvents="box-none" style={styles.row}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: !explorationVisible }}
            style={[styles.modeControl, !explorationVisible && styles.activeControl]} onPress={() => {
              setExploring(false);
              setExplorationMessage('');
            }}>
            <Text style={styles.label}>Navigation</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: explorationVisible }}
            style={[styles.modeControl, explorationVisible && styles.activeControl]} onPress={() => {
              if (!canExplore) {
                setExplorationMessage('Adresse du viewer 3D manquante. Redémarre Expo depuis le dossier mobile.');
                return;
              }
              setExplorationMessage('');
              setRouteAtExplorationStart(props.walkingRoute);
              setExploring(true);
            }}>
            <Text style={styles.label}>Explorer</Text>
          </Pressable>
          {mapControlsVisible && (
            <Pressable accessibilityRole="button" accessibilityLabel={flat ? 'Passer en vue 3D' : 'Passer en vue 2D'} style={styles.modeControl} onPress={() => setFlat((value) => !value)}>
              <Text style={styles.label}>{flat ? 'Vue 3D' : 'Vue 2D'}</Text>
            </Pressable>
          )}
        </View>
        {mapControlsVisible && search !== '' && (
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.results}>
            {matches.map(({ place, index }) => (
              <Pressable key={index} accessibilityRole="button" style={styles.result} onPress={() => {
                select(index);
                setQuery('');
                Keyboard.dismiss();
              }}>
                <Text style={styles.label}>{place.name}</Text>
              </Pressable>
            ))}
            {matches.length === 0 && <Text style={styles.result}>Aucune étape trouvée</Text>}
          </ScrollView>
        )}
        {explorationMessage !== '' && <Text style={styles.control} accessibilityLiveRegion="polite">{explorationMessage}</Text>}
      </SafeAreaView>
      )}
      {!props.guidance && (explorationVisible || (ActiveNavigationMap && selected !== props.completed)) && (
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
  controls: { position: 'absolute', top: 8, left: 16, right: 16, gap: 8 },
  routeHeader: { backgroundColor: '#fffdf8', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, elevation: 3, shadowColor: '#102c26', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  routeHeaderRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36, gap: 12, paddingVertical: 4 },
  routeDestinationRow: { borderTopColor: '#d9e7db', borderTopWidth: StyleSheet.hairlineWidth },
  originDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#285b4b' },
  destinationDot: { width: 12, height: 12, borderRadius: 4, backgroundColor: '#89431f' },
  routeOrigin: { flex: 1, color: '#53665e', fontSize: 14 },
  routeDestination: { flex: 1, color: '#19372e', fontSize: 16, fontWeight: '800' },
  guidanceHeader: { backgroundColor: '#fffdf8', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16, gap: 14, flexDirection: 'row', alignItems: 'center', elevation: 3, shadowColor: '#19372e', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  guidanceArrow: { color: '#285b4b', fontSize: 38, fontWeight: '800' },
  guidanceText: { flex: 1, gap: 5 },
  followingInstruction: { color: '#285b4b', backgroundColor: '#edf3eb', padding: 10, borderRadius: 12, alignSelf: 'flex-start', fontSize: 14 },
  guidanceInstruction: { color: '#19372e', fontSize: 20, lineHeight: 26, fontWeight: '700' },
  guidanceDetail: { color: '#53665e', fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', backgroundColor: '#fffdf8', borderRadius: 16, padding: 4, gap: 4 },
  modeControl: { flex: 1, minHeight: 44, paddingHorizontal: 4, paddingVertical: 8, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingLeft: 16, backgroundColor: '#fffdf8', borderRadius: 18, gap: 12, elevation: 3, shadowColor: '#102c26', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  searchIcon: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#285b4b', backgroundColor: '#d9e7db' },
  searchInput: { flex: 1, minHeight: 52, color: '#19372e', fontSize: 16, paddingRight: 12 },
  clear: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  clearLabel: { color: '#285b4b', fontSize: 24 },
  results: { maxHeight: 176, backgroundColor: '#fff', borderRadius: 12 },
  result: { minHeight: 44, padding: 12, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#d9e7db' },
  control: { backgroundColor: '#fff', borderRadius: 14, minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  activeControl: { backgroundColor: '#d9e7db' },
  label: { color: '#19372e', fontWeight: '600', fontSize: 13 },
  places: { position: 'absolute', bottom: 36, right: 12, left: 12, flexDirection: 'row', gap: 4 },
  place: { flex: 1, color: '#19372e', textAlign: 'center' },
});
