import { hasServicesEnabledAsync, requestForegroundPermissionsAsync } from 'expo-location';
import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type Camera, type LatLng } from 'react-native-maps';
import { stops } from './demoTrip';
import { routeCoordinates } from './demoWalkingRoute';
import type { TripMapProps } from './TripMap';

const tripCamera: Camera = {
  center: { latitude: 31.634, longitude: -7.9948 },
  pitch: 45,
  heading: 0,
  zoom: 13.7,
  altitude: 4250,
};

export default function TripMap({ completed, traveling }: TripMapProps) {
  const map = useRef<MapView>(null);
  const lastPosition = useRef<LatLng | null>(null);
  const centerOnNextFix = useRef(false);
  const [showPosition, setShowPosition] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [satellite, setSatellite] = useState(true);

  function centerOnPosition(position: LatLng) {
    map.current?.animateCamera({
      ...tripCamera,
      center: { latitude: position.latitude, longitude: position.longitude },
      zoom: 16,
      altitude: 900,
    });
  }

  async function locate() {
    setRequesting(true);
    setLocationMessage('');
    try {
      const { granted, canAskAgain } = await requestForegroundPermissionsAsync();
      if (!granted) {
        centerOnNextFix.current = false;
        lastPosition.current = null;
        setShowPosition(false);
        setLocationMessage(canAskAgain
          ? 'Autorise la localisation pour afficher ta position.'
          : 'Active la localisation pour Expo Go dans les réglages du téléphone.');
        return;
      }

      if (!(await hasServicesEnabledAsync())) {
        setLocationMessage('Active la localisation sur ton téléphone, puis réessaie.');
        return;
      }

      if (lastPosition.current) {
        centerOnPosition(lastPosition.current);
      } else {
        centerOnNextFix.current = true;
        setLocationMessage('Recherche de ta position…');
      }
      setShowPosition(true);
    } catch {
      setLocationMessage('Impossible d’accéder à la localisation. Réessaie.');
    } finally {
      setRequesting(false);
    }
  }

  return (
    <View style={styles.frame}>
      <View style={styles.container}>
        <MapView
          ref={map}
          style={StyleSheet.absoluteFill}
          initialCamera={tripCamera}
          mapType={satellite ? 'hybrid' : 'standard'}
          pitchEnabled
          showsCompass
          showsPointsOfInterests
          showsUserLocation={showPosition}
          showsMyLocationButton={false}
          onUserLocationChange={({ nativeEvent: { coordinate } }) => {
            if (!coordinate) return;
            lastPosition.current = coordinate;
            if (centerOnNextFix.current) {
              centerOnNextFix.current = false;
              centerOnPosition(coordinate);
              setLocationMessage('');
            }
          }}
        >
          <Polyline coordinates={routeCoordinates} strokeColor="#102c26" strokeWidth={10} zIndex={0} />
          <Polyline coordinates={routeCoordinates} strokeColor="#6ce5bc" strokeWidth={6} zIndex={1} />
          {stops.map(({ name, time, detail, coordinate }, index) => (
            <Marker
              key={name}
              coordinate={coordinate}
              title={`${index + 1}. ${name}`}
              description={`${time} · ${index < completed ? 'Terminée' : detail}`}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[
                styles.marker,
                traveling && index === completed && styles.nextMarker,
                index < completed && styles.completedMarker,
              ]}>
                <Text style={styles.markerLabel}>{index < completed ? '✓' : index + 1}</Text>
              </View>
            </Marker>
          ))}
        </MapView>
        <View style={styles.controls} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              centerOnNextFix.current = false;
              setLocationMessage('');
              map.current?.animateCamera(tripCamera);
            }}
            style={styles.locate}
          >
            <Text style={styles.locateLabel}>Tout le trajet</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={requesting}
            onPress={locate}
            style={styles.locate}
          >
            <Text style={styles.locateLabel}>Ma position</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSatellite((value) => !value)}
            style={styles.locate}
          >
            <Text style={styles.locateLabel}>{satellite ? 'Vue plan' : 'Vue satellite'}</Text>
          </Pressable>
          {locationMessage !== '' && (
            <Text accessibilityLiveRegion="polite" style={styles.message}>{locationMessage}</Text>
          )}
        </View>
      </View>
      <View style={styles.attribution}>
        <Text style={styles.attributionText}>Trajet à pied · OSRM/FOSSGIS</Text>
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
  controls: {
    position: 'absolute',
    top: 52,
    left: 12,
    right: 12,
    alignItems: 'flex-end',
    gap: 6,
  },
  locate: {
    backgroundColor: '#f7faf7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locateLabel: { color: '#19372e', fontWeight: '700' },
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
  attribution: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingVertical: 4 },
  attributionText: { color: '#4e6258', fontSize: 11 },
  attributionLink: { color: '#285b4b', fontSize: 11, textDecorationLine: 'underline' },
  message: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    color: '#19372e',
  },
});
