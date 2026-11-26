import { getCurrentPositionAsync, requestForegroundPermissionsAsync } from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Camera, type MapType } from 'react-native-maps';
import { routeCoordinates } from '../demoWalkingRoute';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TripMapProps } from '../TripMap';

const tripCamera: Camera = {
  center: { latitude: 34.064, longitude: -4.978 },
  pitch: 0,
  heading: 0,
  zoom: 13.7,
  altitude: 4250,
};

export default function LegacyMap({ stops, completed, showPosition, walkingRoute, onPositionEnabled, routeDestination, guidance,
  google, flat, selected, onSelect }: TripMapProps & {
    google: boolean;
    flat: boolean;
    selected: number;
    onSelect: (index: number) => void;
  }) {
  const map = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [layersOpen, setLayersOpen] = useState(false);
  const [traffic, setTraffic] = useState(false);
  const [positionMessage, setPositionMessage] = useState('');
  const coordinates = walkingRoute?.coordinates ?? (routeDestination ? undefined : routeCoordinates);
  const guiding = guidance !== undefined;
  const position = guidance?.position;
  const [following, setFollowing] = useState(true);
  const [navigationFlat, setNavigationFlat] = useState(true);

  useEffect(() => {
    setFollowing(true);
    setNavigationFlat(true);
  }, [guiding]);

  useEffect(() => {
    if (!mapReady || guiding) return;
    if (walkingRoute) {
      map.current?.fitToCoordinates(walkingRoute.coordinates, {
        edgePadding: { top: routeDestination ? 155 : 80, right: 48, bottom: 84, left: 48 },
        animated: true,
      });
    } else {
      map.current?.animateCamera({ ...tripCamera, center: stops[selected].coordinate, pitch: flat ? 0 : 50 });
    }
  }, [mapReady, walkingRoute, selected, flat, routeDestination, guiding]);

  useEffect(() => {
    if (mapReady && !guiding) map.current?.animateCamera({ pitch: flat ? 0 : 50 });
  }, [mapReady, flat, guiding]);

  useEffect(() => {
    if (!mapReady || !position || !following) return;
    map.current?.animateCamera({
      center: position, zoom: 17.5, altitude: 500, pitch: navigationFlat ? 0 : 35,
      ...(position.heading !== null && position.heading >= 0 && { heading: position.heading }),
    }, { duration: 650 });
  }, [mapReady, position, following, navigationFlat]);

  async function recenter() {
    setPositionMessage('');
    try {
      const { granted } = await requestForegroundPermissionsAsync();
      if (!granted) {
        setPositionMessage('Localisation non autorisée');
        return;
      }
      const { coords } = await getCurrentPositionAsync();
      onPositionEnabled?.();
      map.current?.animateCamera({ center: coords, zoom: 15 });
    } catch {
      setPositionMessage('Position indisponible');
    }
  }

  return (
    <View style={styles.frame}>
      <View style={styles.container}>
        <MapView
          ref={map}
          provider={google ? PROVIDER_GOOGLE : undefined}
          style={StyleSheet.absoluteFill}
          initialCamera={tripCamera}
          onMapReady={() => setMapReady(true)}
          mapType={guiding ? 'standard' : mapType}
          userInterfaceStyle="light"
          onPanDrag={() => { if (guiding) setFollowing(false); }}
          mapPadding={guiding ? { top: 170, right: 24, bottom: 100, left: 24 } : undefined}
          showsTraffic={google && traffic}
          showsBuildings={!guiding && !flat}
          pitchEnabled
          showsCompass
          showsPointsOfInterests={false}
          showsUserLocation={showPosition}
          showsMyLocationButton={false}
        >
          {coordinates && (
            <>
              <Polyline coordinates={coordinates} strokeColor="#ffffff" strokeWidth={13} zIndex={0} />
              <Polyline coordinates={coordinates} strokeColor={guiding ? '#87909b' : '#3830c9'} strokeWidth={8} zIndex={1} />
              {guiding && <Polyline coordinates={guidance.remainingCoordinates ?? coordinates} strokeColor="#3830c9" strokeWidth={9} zIndex={2} />}
            </>
          )}
          {stops.map(({ name, time, detail, coordinate }, index) => (!guiding || index === completed) && (
            <Marker
              key={index}
              coordinate={coordinate}
              title={`${index + 1}. ${name}`}
              description={`${time} · ${index < completed ? 'Terminée' : detail}`}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => onSelect(index)}
            >
              <View style={[
                styles.marker,
                index === completed && styles.nextMarker,
                index < completed && styles.completedMarker,
              ]}>
                <Text style={styles.markerLabel}>{index < completed ? '✓' : index + 1}</Text>
              </View>
            </Marker>
          ))}
        </MapView>
      </View>
      {guiding && <View style={styles.mapControls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Changer l’inclinaison de la carte" style={styles.control} onPress={() => {
          setNavigationFlat((value) => !value);
          setFollowing(true);
        }}>
          <Text style={styles.controlLabel}>{navigationFlat ? 'Vue 3D' : 'Vue 2D'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.control} disabled={!position} onPress={() => setFollowing(true)}>
          <Text style={styles.controlLabel}>{following ? 'Suivi GPS' : 'Recentrer'}</Text>
        </Pressable>
      </View>}
      {!guiding && <View style={styles.mapControls}>
        <Pressable style={styles.control} accessibilityRole="button" accessibilityState={{ expanded: layersOpen }} onPress={() => setLayersOpen((open) => !open)}>
          <Text style={styles.controlLabel}>Couches</Text>
        </Pressable>
        {layersOpen && (
          <View style={styles.layerMenu}>
            {(['standard', 'satellite', 'hybrid', ...(google ? ['terrain'] : [])] as MapType[]).map((type) => (
              <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: mapType === type }} style={styles.control} onPress={() => {
                setMapType(type);
                setLayersOpen(false);
              }}>
                <Text>{{ standard: 'Plan', satellite: 'Satellite', hybrid: 'Hybride', terrain: 'Terrain' }[type as 'standard' | 'satellite' | 'hybrid' | 'terrain']}</Text>
              </Pressable>
            ))}
            {google && <Pressable accessibilityRole="button" accessibilityState={{ selected: traffic }} style={styles.control} onPress={() => setTraffic((shown) => !shown)}>
              <Text>{traffic ? 'Masquer le trafic' : 'Afficher le trafic'}</Text>
            </Pressable>}
          </View>
        )}
        <Pressable style={styles.control} accessibilityRole="button" onPress={() => void recenter()}>
          <Text accessibilityLiveRegion="polite" style={styles.controlLabel}>{positionMessage || 'Ma position'}</Text>
        </Pressable>
      </View>}
      <SafeAreaView pointerEvents="box-none" edges={['left']} style={styles.creditsPosition}>
        <View style={styles.attribution}>
        <Text style={styles.attributionText}>OSRM/FOSSGIS</Text>
        <Text
          accessibilityRole="link"
          style={styles.attributionLink}
          onPress={() => { void Linking.openURL('https://www.openstreetmap.org/copyright'); }}
        >© OpenStreetMap</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#e6ebe2',
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#285b4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerLabel: { color: '#fff', fontWeight: '800' },
  nextMarker: { backgroundColor: '#89431f' },
  completedMarker: { backgroundColor: '#536960' },
  creditsPosition: { position: 'absolute', bottom: 28, left: 8 },
  mapControls: { position: 'absolute', bottom: 62, right: 16, alignItems: 'flex-end', gap: 10 },
  layerMenu: { gap: 4, alignItems: 'stretch', backgroundColor: '#fffdf8', padding: 6, borderRadius: 18 },
  control: { backgroundColor: '#fffdf8', paddingHorizontal: 16, minHeight: 46, borderRadius: 16, justifyContent: 'center', elevation: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: '#dce5dc' },
  controlLabel: { color: '#19372e', fontWeight: '700' },
  attribution: { flexDirection: 'row', gap: 6, backgroundColor: '#fffdf8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  attributionText: { color: '#4e6258', fontSize: 11 },
  attributionLink: { color: '#285b4b', fontSize: 11, textDecorationLine: 'underline' },
});

