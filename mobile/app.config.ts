import type { ConfigContext, ExpoConfig } from 'expo/config';

export default function configure({ config }: ConfigContext): ExpoConfig {
  const androidGoogleMapsApiKey = process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY;
  const plugins = [...(config.plugins ?? [])];
  if (androidGoogleMapsApiKey) plugins.push(['react-native-maps', { androidGoogleMapsApiKey }]);
  return {
    ...config,
    name: config.name ?? 'TravelBuddy',
    slug: config.slug ?? 'travelbuddy',
    plugins,
  };
}
