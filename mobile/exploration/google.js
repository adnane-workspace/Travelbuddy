const status = document.getElementById('status');

function notify(type, payload = {}) {
  window.ReactNativeWebView?.postMessage(JSON.stringify({ version: 1, type, ...payload }));
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
    center: { lat: 34.064, lng: -4.978 }, zoom: 13,
    mapTypeId: 'roadmap',
    mapId: 'DEMO_MAP_ID', renderingType: 'VECTOR', gestureHandling: 'greedy',
    headingInteractionEnabled: true, tiltInteractionEnabled: true,
    streetViewControl: true, fullscreenControl: false, mapTypeControl: true,
    mapTypeControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
    streetViewControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
  });
  const marker = new AdvancedMarkerElement({ map });
  const details = new google.maps.InfoWindow();
  const results = document.getElementById('results');
  const message = document.getElementById('search-message');
  const categoryButtons = [...document.querySelectorAll('[data-type]')];
  let requestId = 0;
  let resultMarkers = [];

  function clearResults() {
    results.replaceChildren();
    for (const resultMarker of resultMarkers) resultMarker.map = null;
    resultMarkers = [];
    categoryButtons.forEach((button) => button.setAttribute('aria-pressed', 'false'));
  }

  function showPlace(place) {
    if (!place.location) return;
    focus(place.location, false);
    marker.title = place.displayName ?? '';
    const content = document.createElement('div');
    content.className = 'place-details';
    const name = document.createElement('strong');
    name.textContent = place.displayName ?? 'Lieu';
    const address = document.createElement('div');
    address.textContent = place.formattedAddress ?? '';
    content.append(name, address);
    if (window.ReactNativeWebView && place.id && place.displayName) {
      const add = document.createElement('button');
      add.className = 'add-place';
      add.textContent = 'Ajouter comme prochaine étape';
      add.addEventListener('click', () => {
        add.disabled = true;
        notify('placeSelected', { place: {
          id: place.id, name: place.displayName, address: place.formattedAddress ?? '',
          coordinate: { latitude: place.location.lat(), longitude: place.location.lng() },
        } });
      });
      content.append(add);
    }
    details.setContent(content);
    details.open({ map, anchor: marker });
  }

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
      requestId += 1;
      clearResults();
      message.textContent = '';
      focus({ lat: latitude, lng: longitude }, command.flat);
    },
  };
  google.maps.event.addListenerOnce(map, 'idle', () => {
    status.hidden = true;
    notify('ready');
  });

  try {
    const { PlaceAutocompleteElement, Place, SearchNearbyRankPreference } = await google.maps.importLibrary('places');
    categoryButtons.forEach((button) => button.addEventListener('click', async () => {
      const current = ++requestId;
      clearResults();
      details.close();
      button.setAttribute('aria-pressed', 'true');
      message.textContent = 'Recherche dans un rayon de 2 km…';
      try {
        const { places } = await Place.searchNearby({
          fields: ['id', 'location', 'displayName', 'formattedAddress'],
          locationRestriction: { center: map.getCenter(), radius: 2000 },
          includedPrimaryTypes: [button.dataset.type],
          maxResultCount: 8,
          rankPreference: SearchNearbyRankPreference.DISTANCE,
        });
        if (current !== requestId) return;
        const located = places.filter((place) => place.location);
        message.textContent = located.length ? 'Autour du centre de la carte · 2 km' : 'Aucun lieu trouvé ici. Déplacez la carte puis réessayez.';
        for (const place of located) {
          const resultMarker = new AdvancedMarkerElement({ map, position: place.location, title: place.displayName });
          resultMarker.addListener('click', () => showPlace(place));
          resultMarkers.push(resultMarker);
          const result = document.createElement('button');
          result.className = 'place-result';
          result.textContent = place.displayName ?? 'Lieu';
          const address = document.createElement('small');
          address.textContent = place.formattedAddress ?? '';
          result.append(address);
          result.addEventListener('click', () => showPlace(place));
          results.append(result);
        }
      } catch {
        if (current === requestId) message.textContent = 'Recherche indisponible. Vérifiez la connexion et la configuration Places, puis réessayez.';
      }
    }));
    const search = new PlaceAutocompleteElement();
    search.placeholder = 'Chercher un lieu sur Google';
    document.getElementById('search').append(search);
    search.addEventListener('gmp-select', async ({ placePrediction }) => {
      const current = ++requestId;
      clearResults();
      message.textContent = 'Chargement du lieu…';
      try {
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ['id', 'location', 'displayName', 'formattedAddress'] });
        if (current !== requestId) return;
        message.textContent = place.location ? '' : 'Position indisponible pour ce lieu.';
        showPlace(place);
      } catch {
        if (current === requestId) message.textContent = 'Ce lieu est momentanément indisponible.';
      }
    });
  } catch {
    document.getElementById('search').textContent = 'Recherche Google indisponible.';
    categoryButtons.forEach((button) => { button.disabled = true; });
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
