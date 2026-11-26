import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { resolveViewerUrl, viewerCommand, viewerEvent } from './bridge.ts';
import { fetchRoute } from './routing.ts';

const start = { longitude: -8.0032, latitude: 31.6417 };
const end = { longitude: -7.9878, latitude: 31.6311 };

test('the viewer URL permits private HTTP only during development', () => {
  const localUrl = 'http://192.168.1.20:8766/';
  assert.equal(resolveViewerUrl(localUrl, true), localUrl);
  assert.equal(resolveViewerUrl(localUrl, false), undefined);
  assert.equal(resolveViewerUrl('http://example.com/', true), undefined);
  assert.equal(resolveViewerUrl('https://example.com/exploration/', false), 'https://example.com/exploration/');
  assert.equal(resolveViewerUrl(undefined, true, 'http://192.168.1.20:8081/index.bundle'), localUrl);
  assert.equal(resolveViewerUrl(undefined, false, 'http://192.168.1.20:8081/index.bundle'), undefined);
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
    ] } }],
  }));
  assert.deepEqual(await fetchRoute(start, end, 'walking'), { coordinates: [start, end], distance: 2100, duration: 900 });
  await fetchRoute(start, end, 'driving');
  assert.match(calls.mock.calls[0].arguments[0], /mapbox\/walking\//);
  assert.match(calls.mock.calls[1].arguments[0], /mapbox\/driving\//);
  calls.mock.mockImplementation(async () => Response.json({ code: 'NoRoute' }));
  await assert.rejects(fetchRoute(start, end, 'walking'), /Route unavailable/);
});
