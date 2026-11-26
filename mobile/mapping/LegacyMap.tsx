import { getCurrentPositionAsync, requestForegroundPermissionsAsync } from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Camera, type MapType } from 'react-native-maps';
import { stops } from '../demoTrip';
import { routeCoordinates } from '../demoWalkingRoute';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TripMapProps } from '../TripMap';

const tripCamera: Camera = {
  center: { latitude: 31.634, longitude: -7.9948 },
  pitch: 45,
  heading: 0,
  zoom: 13.7,
  altitude: 4250,
};

export default function LegacyMap({ completed, showPosition, walkingRoute, onPositionEnabled, routeDestination, guidance,
  google, flat, selected, onSelect }: TripMapProps & {
    google: boolean;
    flat: boolean;
    selected: number;
    onSelect: (index: number) => void;
  }) {
  const map = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<MapType>('hybrid');
  const [layersOpen, setLayersOpen] = useState(false);
  const [traffic, setTraffic] = useState(false);
  const [positionMessage, setPositionMessage] = useState('');
  const coordinates = walkingRoute?.coordinates ?? (routeDestination ? undefined : routeCoordinates);
  const guiding = guidance !== undefined;
  const position = guidance?.position;

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
    if (!mapReady || !position) return;
    map.current?.animateCamera({
      center: position, zoom: 17, altitude: 650, pitch: 58,
      ...(position.heading !== null && position.heading >= 0 && { heading: position.heading }),
    }, { duration: 650 });
  }, [mapReady, position]);

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
          mapType={mapType}
          showsTraffic={google && traffic}
          showsBuildings={!flat}
          pitchEnabled
          showsCompass
          showsPointsOfInterests
          showsUserLocation={showPosition}
          showsMyLocationButton={false}
        >
          {coordinates && (
            <>
              <Polyline coordinates={coordinates} strokeColor="#102c26" strokeWidth={10} zIndex={0} />
              <Polyline coordinates={coordinates} strokeColor="#6ce5bc" strokeWidth={6} zIndex={1} />
            </>
          )}
          {stops.map(({ name, time, detail, coordinate }, index) => (
            <Marker
              key={name}
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
      <SafeAreaView pointerEvents="box-none" edges={['top', 'right']} style={styles.creditsPosition}>
        <View style={styles.attribution}>
        <Text style={styles.attributionText}>OSRM/FOSSGIS</Text>
        <Text
          accessibilityRole="link"
          style={styles.attributionLink}
          onPress={() => { void Linking.openURL('https://www.openstreetmap.org/copyright'); }}
        >© OpenStreetMap</Text>
        <Text
          accessibilityRole="link"
          style={styles.attributionLink}
          onPress={() => { void Linking.openURL('https://www.openstreetmap.org/fixthemap'); }}
        >Corriger la carte</Text>
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
  mapControls: { position: 'absolute', bottom: 34, right: 10, alignItems: 'flex-end', gap: 6 },
  layerMenu: { gap: 2, alignItems: 'stretch' },
  control: { backgroundColor: '#f7f4ec', paddingHorizontal: 14, minHeight: 44, borderRadius: 14, justifyContent: 'center', elevation: 3 },
  controlLabel: { color: '#19372e', fontWeight: '700' },
  attribution: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  attributionText: { color: '#4e6258', fontSize: 11 },
  attributionLink: { color: '#285b4b', fontSize: 11, textDecorationLine: 'underline' },
});

