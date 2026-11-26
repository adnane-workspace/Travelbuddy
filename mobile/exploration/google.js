const status = document.getElementById('status');

function notify(type) {
  window.ReactNativeWebView?.postMessage(JSON.stringify({ version: 1, type }));
}

function unavailable() {
  status.hidden = false;
  status.textContent = 'Google Maps indisponible. Vérifie la clé, les API activées et les restrictions du site.';
  notify('error');
}

async function initialize() {
  const { Map } = await google.maps.importLibrary('maps');
  const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
  const map = new Map(document.getElementById('map'), {
    center: { lat: 31.634, lng: -7.9948 }, zoom: 13,
    mapTypeId: 'hybrid',
    mapId: 'DEMO_MAP_ID', renderingType: 'VECTOR', gestureHandling: 'greedy',
    headingInteractionEnabled: true, tiltInteractionEnabled: true,
    streetViewControl: true, fullscreenControl: false, mapTypeControl: true,
    mapTypeControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
    streetViewControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
  });
  const marker = new AdvancedMarkerElement({ map });
  const details = new google.maps.InfoWindow();

  function focus(point, flat) {
    map.getStreetView().setVisible(false);
    details.close();
    marker.position = point;
    map.panTo(point);
    map.setZoom(flat ? 15 : 17);
    if (map.getRenderingType() === 'VECTOR') {
      map.setHeading(flat ? 0 : 25);
      map.setTilt(flat ? 0 : 55);
    }
  }

  window.travelBuddy = {
    receive(command) {
      const { latitude, longitude } = command?.destination ?? {};
      if (command?.version !== 1 || command.type !== 'flyTo' || typeof command.flat !== 'boolean'
        || !Number.isFinite(latitude) || !Number.isFinite(longitude)
        || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
      focus({ lat: latitude, lng: longitude }, command.flat);
    },
  };
  google.maps.event.addListenerOnce(map, 'idle', () => {
    status.hidden = true;
    notify('ready');
  });

  try {
    const { PlaceAutocompleteElement } = await google.maps.importLibrary('places');
    const search = new PlaceAutocompleteElement();
    search.placeholder = 'Chercher un lieu sur Google';
    document.getElementById('search').append(search);
    search.addEventListener('gmp-select', async ({ placePrediction }) => {
      try {
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ['location', 'displayName', 'formattedAddress'] });
        if (!place.location) return;
        focus(place.location, false);
        marker.title = place.displayName ?? '';
        const content = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = place.displayName ?? '';
        const address = document.createElement('div');
        address.textContent = place.formattedAddress ?? '';
        content.append(name, address);
        details.setContent(content);
        details.open({ map, anchor: marker });
      } catch {
        status.hidden = false;
        status.textContent = 'Ce lieu est momentanément indisponible.';
      }
    });
  } catch {
    document.getElementById('search').textContent = 'Recherche Google indisponible.';
  }
}

window.gm_authFailure = unavailable;
window.startTravelBuddyGoogle = () => initialize().catch(unavailable);
if (window.travelBuddyGoogleKey) {
  const script = document.createElement('script');
  const parameters = new URLSearchParams({ key: window.travelBuddyGoogleKey, loading: 'async',
    callback: 'startTravelBuddyGoogle', v: 'quarterly', language: 'fr' });
  script.src = `https://maps.googleapis.com/maps/api/js?${parameters}`;
  script.async = true;
  script.onerror = unavailable;
  document.head.append(script);
} else {
  unavailable();
}
