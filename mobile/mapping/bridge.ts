export type Destination = { latitude: number; longitude: number };

export function resolveViewerUrl(value: string | undefined, development: boolean, bundleUrl?: string) {
  if (!value && development && bundleUrl) {
    try {
      const { hostname } = new URL(bundleUrl);
      value = `http://${hostname}:8766/`;
    } catch {
      return;
    }
  }
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash) return;
    if (url.protocol === 'https:') return url.href;
    const localHost = /^(localhost|127\.0\.0\.1|10(?:\.\d+){3}|192\.168(?:\.\d+){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d+){2})$/;
    if (development && url.protocol === 'http:' && localHost.test(url.hostname)) return url.href;
  } catch {
    return;
  }
}

export function viewerCommand(destination: Destination, flat: boolean) {
  return `window.travelBuddy?.receive(${JSON.stringify({ version: 1, type: 'flyTo', destination, flat })}); true;`;
}

export function viewerEvent(message: string) {
  try {
    const event = JSON.parse(message);
    if (event?.version !== 1) return;
    if (event.type === 'ready' || event.type === 'fallback' || event.type === 'error') return event.type as 'ready' | 'fallback' | 'error';
  } catch {
    return;
  }
}
