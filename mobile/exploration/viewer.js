function notify(type) {
  window.ReactNativeWebView?.postMessage(JSON.stringify({ version: 1, type }));
}

function validDestination(point) {
  return point && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180
    && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90;
}

async function startViewer() {
  const { ionToken, photorealistic } = window.travelBuddyViewer;
  if (!ionToken) throw new Error('A public Cesium ion token is required');
  Cesium.Ion.defaultAccessToken = ionToken;
  const viewer = new Cesium.Viewer('globe', {
    animation: false, timeline: false, geocoder: false, homeButton: false,
    navigationHelpButton: false, fullscreenButton: false, sceneModePicker: false,
    baseLayerPicker: false, selectionIndicator: false, infoBox: false,
    requestRenderMode: true, maximumRenderTimeChange: Infinity,
    baseLayer: Cesium.ImageryLayer.fromWorldImagery(),
    terrain: Cesium.Terrain.fromWorldTerrain(),
  });
  viewer.resolutionScale = 0.8;
  viewer.canvas.addEventListener('webglcontextlost', () => notify('error'));
  viewer.scene.renderError.addEventListener(() => notify('error'));
  let tileset;

  window.travelBuddy = {
    receive(command) {
      if (command?.version !== 1 || command.type !== 'flyTo' || typeof command.flat !== 'boolean'
        || !validDestination(command.destination)) return;
      const { longitude, latitude } = command.destination;
      if (tileset) {
        tileset.show = !command.flat;
        viewer.scene.globe.show = command.flat;
      }
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, command.flat ? 4800 : 2000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(command.flat ? -90 : -52), roll: 0 },
        duration: 3,
      });
    },
  };

  if (photorealistic) {
    try {
      tileset = await Cesium.createGooglePhotorealistic3DTileset({}, {
        showCreditsOnScreen: true, maximumScreenSpaceError: 24,
        cacheBytes: 96 * 1024 * 1024, maximumCacheOverflowBytes: 48 * 1024 * 1024,
      });
      viewer.scene.primitives.add(tileset);
      viewer.scene.globe.show = false;
      tileset.tileFailed.addEventListener(() => {
        if (!tileset) return;
        viewer.scene.primitives.remove(tileset);
        tileset = undefined;
        viewer.scene.globe.show = true;
        notify('fallback');
      });
    } catch {
      notify('fallback');
    }
  }
  notify('ready');
  window.addEventListener('pagehide', () => viewer.destroy(), { once: true });
}

startViewer().catch(() => notify('error'));
