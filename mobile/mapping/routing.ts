import type { WalkingRoute } from '../TripMap';
import type { Destination } from './bridge';

export type RouteProfile = 'walking' | 'driving';

export async function fetchRoute(origin: Destination, destination: Destination, profile: RouteProfile): Promise<WalkingRoute> {
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const useMapbox = token?.startsWith('pk.');
  const url = useMapbox
    ? `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`
    : `https://routing.openstreetmap.de/routed-${profile === 'walking' ? 'foot' : 'car'}/route/v1/driving/${coordinates}?geometries=geojson&overview=full&radiuses=1000;1000`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: useMapbox ? undefined : { 'User-Agent': 'TravelBuddy/1.0' },
    });
    if (!response.ok) throw new Error('Routing request failed');
    const { code, routes }: { code: string; routes?: {
      distance: number;
      duration: number;
      geometry?: { coordinates: [number, number][] };
    }[] } = await response.json();
    const route = routes?.[0];
    const points = route?.geometry?.coordinates;
    if (code !== 'Ok' || !route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)
      || !Array.isArray(points) || points.length < 2
      || !points.every((point) => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]))) {
      throw new Error('Route unavailable');
    }
    return {
      coordinates: points.map(([longitude, latitude]) => ({ longitude, latitude })),
      distance: route.distance,
      duration: route.duration,
    };
  } finally {
    clearTimeout(timeout);
  }
}
