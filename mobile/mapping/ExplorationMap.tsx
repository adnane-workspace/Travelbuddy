import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { viewerCommand, viewerEvent, type Destination, type SelectedPlace } from './bridge';

export default function ExplorationMap({ url, destination, flat, onFailure, onPlaceSelected }: {
  url: string;
  destination: Destination;
  flat: boolean;
  onFailure: () => void;
  onPlaceSelected: (place: SelectedPlace) => void;
}) {
  const web = useRef<WebView<Record<never, never>>>(null);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const origin = new URL(url).origin;

  useEffect(() => {
    if (ready) return;
    const timeout = setTimeout(onFailure, 20000);
    return () => clearTimeout(timeout);
  }, [ready, onFailure]);

  useEffect(() => {
    if (ready) web.current?.injectJavaScript(viewerCommand(destination, flat));
  }, [ready, destination, flat]);

  return (
    <View style={styles.container}>
      <WebView<Record<never, never>>
        ref={web}
        source={{ uri: url }}
        originWhitelist={[origin]}
        onShouldStartLoadWithRequest={({ url: request }) => request === url}
        allowFileAccess={false}
        mixedContentMode="never"
        setSupportMultipleWindows={false}
        onError={onFailure}
        onHttpError={onFailure}
        onContentProcessDidTerminate={onFailure}
        onRenderProcessGone={onFailure}
        onMessage={({ nativeEvent }) => {
          if (nativeEvent.url !== url) return;
          const event = viewerEvent(nativeEvent.data);
          if (event === 'ready') setReady(true);
          if (event === 'fallback') setFallback(true);
          if (event === 'error') onFailure();
          if (typeof event === 'object' && event.type === 'placeSelected') onPlaceSelected(event.place);
        }}
      />
      {!ready && <ActivityIndicator style={StyleSheet.absoluteFill} accessibilityLabel="Chargement de la carte 3D" />}
      {fallback && <Text style={styles.notice}>Globe avec relief et imagerie</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#172420' },
  notice: { position: 'absolute', bottom: 36, left: 12, color: '#fff', backgroundColor: '#172420', padding: 6 },
});
