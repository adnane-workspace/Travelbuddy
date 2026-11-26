import type { WalkingRoute } from '../TripMap';
import type { Destination } from './bridge';

export type RouteManeuver = {
  offset: number;
  type?: string;
  modifier?: string;
  instruction?: string;
  road?: string;
};

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

export function getGuidance(route: WalkingRoute, position: Destination) {
  const longitudeScale = 111_195 * Math.cos(position.latitude * Math.PI / 180);
  const project = ({ longitude, latitude }: Destination) => ({
    x: (longitude - position.longitude) * longitudeScale,
    y: (latitude - position.latitude) * 111_195,
  });
  let previous = project(route.coordinates[0]);
  let length = 0;
  let closest = Infinity;
  let offset = 0;
  let segmentIndex = 0;
  let nearestIndex = 0;
  let heading = 0;
  let nearestFraction = 0;
  for (const coordinate of route.coordinates.slice(1)) {
    const point = project(coordinate);
    const dx = point.x - previous.x;
    const dy = point.y - previous.y;
    const squared = dx * dx + dy * dy;
    const fraction = squared ? Math.max(0, Math.min(1, -(previous.x * dx + previous.y * dy) / squared)) : 0;
    const distance = Math.hypot(previous.x + fraction * dx, previous.y + fraction * dy);
    const segment = Math.sqrt(squared);
    if (distance < closest) {
      closest = distance;
      offset = length + fraction * segment;
      nearestIndex = segmentIndex;
      nearestFraction = fraction;
      heading = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
    }
    segmentIndex += 1;
    length += segment;
    previous = point;
  }

  const distanceTraveled = length ? route.distance * offset / length : 0;
  const remaining = Math.max(0, route.distance - distanceTraveled);
  const offRoute = closest > 65;
  const arrived = remaining < 20 && Math.hypot(previous.x, previous.y) < 35;
  const step = route.maneuvers?.find(({ type, offset }) => type !== 'depart' && offset >= distanceTraveled - 8);
  const following = step && route.maneuvers?.[route.maneuvers.indexOf(step) + 1];
  const segmentStart = route.coordinates[nearestIndex];
  const segmentEnd = route.coordinates[nearestIndex + 1] ?? segmentStart;
  const snappedPosition = {
    latitude: segmentStart.latitude + (segmentEnd.latitude - segmentStart.latitude) * nearestFraction,
    longitude: segmentStart.longitude + (segmentEnd.longitude - segmentStart.longitude) * nearestFraction,
  };
  return {
    heading,
    remainingCoordinates: [snappedPosition, ...route.coordinates.slice(nearestIndex + 1)],
    arrow: offRoute ? '↻' : arrived ? '✓' : maneuverArrow(step),
    following: !offRoute && !arrived && following ? `Puis ${maneuverArrow(following)} ${instructionFor(following)}` : undefined,
    remaining,
    minutes: route.distance > 0 ? Math.ceil(route.duration * remaining / route.distance / 60) : 0,
    offRoute,
    arrived,
    instruction: offRoute ? 'Hors itinéraire' : arrived ? 'Vous êtes arrivé' : instructionFor(step),
    detail: !offRoute && !arrived && step ? `Dans ${formatDistance(Math.max(0, step.offset - distanceTraveled))}` : '',
  };
}

function maneuverArrow(step?: RouteManeuver) {
  if (!step) return '↑';
  if (step.type === 'arrive') return '⚑';
  if (step.modifier === 'uturn') return '↶';
  if (step.type === 'roundabout' || step.type === 'rotary') return '↻';
  if (step.modifier?.includes('left')) return '↰';
  if (step.modifier?.includes('right')) return '↱';
  return '↑';
}

function instructionFor(step?: RouteManeuver) {
  if (!step) return 'Suivez le trajet';
  if (step.instruction) return step.instruction;
  const road = step.road ? ` vers ${step.road}` : '';
  if (step.type === 'arrive') return 'Rejoignez votre destination';
  if (step.type === 'roundabout' || step.type === 'rotary') return `Prenez le rond-point${road}`;
  if (step.modifier === 'uturn') return 'Faites demi-tour';
  if (step.modifier?.includes('left')) return `Tournez à gauche${road}`;
  if (step.modifier?.includes('right')) return `Tournez à droite${road}`;
  return `Continuez tout droit${road}`;
}
