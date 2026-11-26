import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type Camera } from 'react-native-maps';
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

export default function TripMap({ completed, traveling, showPosition, walkingRoute }: TripMapProps) {
  const map = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const coordinates = walkingRoute?.coordinates ?? routeCoordinates;

  useEffect(() => {
    if (!mapReady) return;
    if (walkingRoute) {
      map.current?.fitToCoordinates(walkingRoute.coordinates, {
        edgePadding: { top: 80, right: 48, bottom: 48, left: 48 },
        animated: true,
      });
    } else {
      map.current?.animateCamera(tripCamera);
    }
  }, [mapReady, walkingRoute]);

  return (
    <View style={styles.frame}>
      <View style={styles.container}>
        <MapView
          ref={map}
          style={StyleSheet.absoluteFill}
          initialCamera={tripCamera}
          onMapReady={() => setMapReady(true)}
          mapType="hybrid"
          pitchEnabled
          showsCompass={false}
          showsPointsOfInterests
          showsUserLocation={showPosition}
          showsMyLocationButton={false}
        >
          <Polyline coordinates={coordinates} strokeColor="#102c26" strokeWidth={10} zIndex={0} />
          <Polyline coordinates={coordinates} strokeColor="#6ce5bc" strokeWidth={6} zIndex={1} />
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
      </View>
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
  creditsPosition: { position: 'absolute', top: 12, right: 12 },
  attribution: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  attributionText: { color: '#4e6258', fontSize: 11 },
  attributionLink: { color: '#285b4b', fontSize: 11, textDecorationLine: 'underline' },
});

