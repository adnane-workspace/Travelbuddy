import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { resolveViewerUrl, viewerCommand, viewerEvent } from './bridge.ts';
import { fetchRoute } from './routing.ts';
import { getGuidance } from './guidance.ts';

const start = { longitude: -4.98389, latitude: 34.06167 };
const end = { longitude: -4.973694, latitude: 34.065083 };

test('the viewer URL permits private HTTP only during development', () => {
  const localUrl = 'http://192.168.1.20:8766/';
  assert.equal(resolveViewerUrl(localUrl, true), localUrl);
  assert.equal(resolveViewerUrl(localUrl, false), undefined);
  assert.equal(resolveViewerUrl('http://example.com/', true), undefined);
  assert.equal(resolveViewerUrl('https://example.com/exploration/', false), 'https://example.com/exploration/');
  assert.equal(resolveViewerUrl(undefined, true, 'http://192.168.1.20:8081/index.bundle'), localUrl);
  assert.equal(resolveViewerUrl(undefined, false, 'http://192.168.1.20:8081/index.bundle'), undefined);
});

test('place selection accepts valid coordinates and rejects malformed web messages', () => {
  const place = { id: 'place-1', name: ' Café ', address: 'Fès', coordinate: start };
  const encode = (value) => JSON.stringify({ version: 1, type: 'placeSelected', place: value });
  assert.deepEqual(viewerEvent(encode(place)), {
    type: 'placeSelected', place: { ...place, name: 'Café' },
  });
  assert.equal(viewerEvent(encode({ ...place, coordinate: { latitude: 100, longitude: 0 } })), undefined);
  assert.equal(viewerEvent(encode({ ...place, coordinate: { latitude: '31', longitude: 0 } })), undefined);
  assert.equal(viewerEvent(encode({ ...place, name: ' ' })), undefined);
  assert.equal(viewerEvent(encode(null)), undefined);
});

test('the native command delivers a destination and view mode to the viewer', () => {
  let command;
  runInNewContext(viewerCommand(end, false), {
    window: { travelBuddy: { receive: (value) => { command = JSON.parse(JSON.stringify(value)); } } },
  });
  assert.deepEqual(command, { version: 1, type: 'flyTo', destination: end, flat: false });
  assert.equal(viewerEvent('{'), undefined);
  assert.equal(viewerEvent('{"version":2,"type":"ready"}'), undefined);
  assert.equal(viewerEvent('{"version":1,"type":"fallback"}'), 'fallback');
});

test('the viewer falls back to the terrain and accepts the native fly-to command', async () => {
  const messages = [];
  const flights = [];
  const window = {
    travelBuddyViewer: { ionToken: 'test', photorealistic: true },
    ReactNativeWebView: { postMessage: (message) => messages.push(viewerEvent(message)) },
    addEventListener() {},
  };
  class Viewer {
    canvas = { addEventListener() {} };
    scene = { renderError: { addEventListener() {} } };
    camera = { flyTo: (camera) => flights.push(camera) };
  }
  const context = {
    window,
    Cesium: {
      Ion: {}, Viewer,
      ImageryLayer: { fromWorldImagery() {} }, Terrain: { fromWorldTerrain() {} },
      Cartesian3: { fromDegrees: (...coordinates) => coordinates },
      Math: { toRadians: (angle) => angle * Math.PI / 180 },
      async createGooglePhotorealistic3DTileset() { throw new Error('Tiles unavailable'); },
    },
  };
  await runInNewContext(readFileSync(new URL('../exploration/viewer.js', import.meta.url), 'utf8'), context);
  assert.deepEqual(messages, ['fallback', 'ready']);
  runInNewContext(viewerCommand(end, false), context);
  assert.deepEqual(flights[0].destination, [end.longitude, end.latitude, 2000]);
});

test('directions use the correct profile and convert GeoJSON coordinates', async (context) => {
  const previousToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = 'pk.test';
  context.after(() => {
    if (previousToken === undefined) delete process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    else process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = previousToken;
  });
  const calls = context.mock.method(globalThis, 'fetch', async () => Response.json({
    code: 'Ok', routes: [{ distance: 2100, duration: 900, geometry: { coordinates: [
      [start.longitude, start.latitude], [end.longitude, end.latitude],
    ] }, legs: [{ steps: [
      { distance: 700, maneuver: { type: 'depart' } },
      { distance: 1400, name: 'Rue du Jardin', maneuver: { type: 'turn', modifier: 'right' } },
    ] }] }],
  }));
  const route = await fetchRoute(start, end, 'walking');
  assert.deepEqual(route.coordinates, [start, end]);
  assert.equal(route.distance, 2100);
  assert.equal(route.duration, 900);
  assert.equal(route.maneuvers[1].offset, 700);
  assert.match(calls.mock.calls[0].arguments[0], /steps=true/);
  await fetchRoute(start, end, 'driving');
  assert.match(calls.mock.calls[0].arguments[0], /mapbox\/walking\//);
  assert.match(calls.mock.calls[1].arguments[0], /mapbox\/driving\//);
  calls.mock.mockImplementation(async () => Response.json({ code: 'NoRoute' }));
  await assert.rejects(fetchRoute(start, end, 'walking'), /Route unavailable/);
});

test('guidance advances along the route and detects deviation and arrival', () => {
  const route = {
    coordinates: [{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.01 }],
    distance: 1000, duration: 600,
    maneuvers: [{ type: 'turn', offset: 500, modifier: 'right', road: 'Rue du Jardin' }, { type: 'arrive', offset: 1000 }],
  };
  const before = getGuidance(route, { latitude: 0, longitude: 0.0025 });
  assert.equal(before.instruction, 'Tournez à droite vers Rue du Jardin');
  assert.equal(before.detail, 'Dans 250 m');
  assert.equal(before.arrow, '↱');
  assert.match(before.following, /destination/);
  assert.equal(before.heading, 90);
  assert.equal(before.remainingCoordinates.length, 2);
  assert.ok(Math.abs(before.remainingCoordinates[0].longitude - 0.0025) < 0.000001);
  assert.equal(getGuidance(route, { latitude: 0, longitude: 0.008 }).instruction, 'Rejoignez votre destination');
  assert.equal(getGuidance(route, { latitude: 0.001, longitude: 0.005 }).offRoute, true);
  assert.equal(getGuidance(route, route.coordinates[1]).arrived, true);
});
