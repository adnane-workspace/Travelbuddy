import Mapbox from '@rnmapbox/maps';
import { useEffect, useRef, useState } from 'react';
import { getCurrentPositionAsync, requestForegroundPermissionsAsync } from 'expo-location';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { stops } from '../demoTrip';
import { routeCoordinates } from '../demoWalkingRoute';
import type { TripMapProps } from '../TripMap';

const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (token?.startsWith('pk.')) void Mapbox.setAccessToken(token);

export default function NavigationMap({ completed, showPosition, onPositionEnabled, walkingRoute, selected, onSelect, flat, dark, onFailure }: TripMapProps & {
  selected: number;
  onSelect: (index: number) => void;
  flat: boolean;
  dark: boolean;
  onFailure: () => void;
}) {
  const camera = useRef<Mapbox.Camera>(null);
  const [ready, setReady] = useState(false);
  const [positionMessage, setPositionMessage] = useState('');
  const stop = stops[selected];
  const route = walkingRoute?.coordinates ?? routeCoordinates;

  useEffect(() => {
    if (!ready) return;
    if (walkingRoute && selected === completed) {
      let west = Infinity;
      let south = Infinity;
      let east = -Infinity;
      let north = -Infinity;
      for (const { longitude, latitude } of walkingRoute.coordinates) {
        west = Math.min(west, longitude);
        south = Math.min(south, latitude);
        east = Math.max(east, longitude);
        north = Math.max(north, latitude);
      }
      camera.current?.setCamera({
        bounds: { ne: [east, north], sw: [west, south], paddingTop: 100, paddingBottom: 60, paddingLeft: 50, paddingRight: 50 },
        pitch: flat ? 0 : 40, animationMode: 'easeTo', animationDuration: 1100,
      });
    } else {
      camera.current?.setCamera({
        centerCoordinate: [stop.coordinate.longitude, stop.coordinate.latitude],
        pitch: flat ? 0 : 55, zoomLevel: flat ? 14 : 16, animationDuration: 1400, animationMode: 'flyTo',
      });
    }
  }, [ready, stop, flat, walkingRoute, selected, completed]);

  useEffect(() => {
    if (ready) return;
    const timeout = setTimeout(onFailure, 20000);
    return () => clearTimeout(timeout);
  }, [ready, onFailure]);

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
      camera.current?.setCamera({ centerCoordinate: [coords.longitude, coords.latitude], animationMode: 'flyTo', animationDuration: 900 });
    } catch {
      setPositionMessage('Position indisponible');
    }
  }

  return (
    <View style={styles.map}>
    <Mapbox.MapView style={styles.map} styleURL="mapbox://styles/mapbox/standard" compassEnabled
      scaleBarEnabled={false} onDidFinishLoadingMap={() => setReady(true)} onMapLoadingError={onFailure}>
      <Mapbox.Camera ref={camera} defaultSettings={{ centerCoordinate: [-7.9948, 31.634], zoomLevel: 13 }} />
      <Mapbox.StyleImport id="basemap" existing config={{ lightPreset: dark ? 'night' : 'day', show3dObjects: !flat }} />
      {!flat && (
        <Mapbox.RasterDemSource id="terrain-source" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={512}>
          <Mapbox.Terrain sourceID="terrain-source" exaggeration={1} />
        </Mapbox.RasterDemSource>
      )}
      {showPosition && <Mapbox.LocationPuck />}
      <Mapbox.ShapeSource id="trip-route" shape={{ type: 'Feature', properties: {}, geometry: {
        type: 'LineString', coordinates: route.map(({ longitude, latitude }) => [longitude, latitude]),
      } }}>
        <Mapbox.LineLayer id="trip-route-outline" style={{ lineColor: '#102c26', lineWidth: 8, lineJoin: 'round' }} />
        <Mapbox.LineLayer id="trip-route-line" style={{ lineColor: '#6ce5bc', lineWidth: 5, lineJoin: 'round' }} />
      </Mapbox.ShapeSource>
      {stops.map(({ name, coordinate }, index) => (
        <Mapbox.PointAnnotation key={name} id={`stop-${index}`} title={name}
          coordinate={[coordinate.longitude, coordinate.latitude]} onSelected={() => onSelect(index)}>
          <View style={[styles.marker, index === selected && styles.selected]}>
            <Text style={styles.markerText}>{index < completed ? '✓' : index + 1}</Text>
          </View>
        </Mapbox.PointAnnotation>
      ))}
    </Mapbox.MapView>
    {ready && (
      <Pressable accessibilityRole="button" style={styles.recenter} onPress={() => void recenter()}>
        <Text accessibilityLiveRegion="polite" style={styles.recenterLabel}>{positionMessage || 'Ma position'}</Text>
      </Pressable>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  marker: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#fff', backgroundColor: '#285b4b', alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: '#89431f' },
  markerText: { color: '#fff', fontWeight: '800' },
  recenter: { position: 'absolute', right: 12, bottom: 35, padding: 12, borderRadius: 12, backgroundColor: '#fff' },
  recenterLabel: { color: '#19372e', fontWeight: '700' },
});
