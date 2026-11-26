const status = document.getElementById('status');
const terrainSource = 'travelbuddy-terrain';
const buildingsLayer = 'travelbuddy-buildings';

function notify(type) {
  window.ReactNativeWebView?.postMessage(JSON.stringify({ version: 1, type }));
}

function showError() {
  status.hidden = false;
  status.textContent = 'Carte 3D indisponible';
  notify('error');
}

async function start() {
  const { Map, Marker, NavigationControl } = await import('https://unpkg.com/maplibre-gl@6.19.0/dist/maplibre-gl.mjs');
  const map = new Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/bright',
    center: [-7.9948, 31.634],
    zoom: 13,
    maxPitch: 75,
  });
  let ready = false;
  let terrainAvailable = true;
  map.on('error', ({ sourceId }) => {
    if (sourceId === terrainSource && terrainAvailable) {
      terrainAvailable = false;
      map.setTerrain(null);
      status.hidden = false;
      status.textContent = 'Relief indisponible';
    } else if (!ready && !sourceId) {
      showError();
    }
  });
  map.getCanvas().addEventListener('webglcontextlost', showError);
  map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');

  map.once('load', () => {
    const style = map.getStyle();
    // Reuse the basemap's building data when it exposes the OpenMapTiles schema.
    const buildingSource = style.layers.find((layer) => layer['source-layer'] === 'building')?.source;
    const labels = style.layers.find((layer) => layer.type === 'symbol' && layer.layout?.['text-field']);
    if (buildingSource) {
      map.addLayer({
        id: buildingsLayer, source: buildingSource, 'source-layer': 'building',
        type: 'fill-extrusion', minzoom: 15,
        filter: ['all', ['!=', ['get', 'hide_3d'], true], ['>', ['to-number', ['get', 'render_height'], 0], 0]],
        paint: {
          'fill-extrusion-color': '#b8a799',
          'fill-extrusion-height': ['to-number', ['get', 'render_height'], 0],
          'fill-extrusion-base': ['to-number', ['get', 'render_min_height'], 0],
        },
      }, labels?.id);
    }

    map.addSource(terrainSource, {
      type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json',
      attribution: '<a href="https://mapterhorn.com/">Mapterhorn</a>',
    });
    const element = document.createElement('div');
    element.className = 'destination';
    const marker = new Marker({ element });
    window.travelBuddy = {
      receive(command) {
        const { latitude, longitude } = command?.destination ?? {};
        if (command?.version !== 1 || command.type !== 'flyTo' || typeof command.flat !== 'boolean'
          || !Number.isFinite(latitude) || !Number.isFinite(longitude)
          || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
        if (buildingSource) map.setLayoutProperty(buildingsLayer, 'visibility', command.flat ? 'none' : 'visible');
        map.setTerrain(command.flat || !terrainAvailable ? null : { source: terrainSource, exaggeration: 1 });
        marker.setLngLat([longitude, latitude]).addTo(map);
        map.flyTo({ center: [longitude, latitude], zoom: command.flat ? 14.5 : 16,
          pitch: command.flat ? 0 : 62, bearing: command.flat ? 0 : -22, duration: 1600 });
      },
    };
    ready = true;
    status.hidden = true;
    notify('ready');
    if (!window.ReactNativeWebView) window.travelBuddy.receive({
      version: 1, type: 'flyTo', destination: { longitude: -8.0032, latitude: 31.6417 }, flat: false,
    });
  });
  window.addEventListener('pagehide', () => map.remove(), { once: true });
}

start().catch(showError);
