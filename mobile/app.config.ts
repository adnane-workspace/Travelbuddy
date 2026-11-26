import type { ConfigContext, ExpoConfig } from 'expo/config';

export default function configure({ config }: ConfigContext): ExpoConfig {
  const androidGoogleMapsApiKey = process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY;
  const iosGoogleMapsApiKey = process.env.EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY;
  const plugins = [...(config.plugins ?? [])];
  if (androidGoogleMapsApiKey || iosGoogleMapsApiKey) {
    plugins.push(['react-native-maps', { androidGoogleMapsApiKey, iosGoogleMapsApiKey }]);
  }
  return {
    ...config,
    name: config.name ?? 'TravelBuddy',
    slug: config.slug ?? 'travelbuddy',
    plugins,
  };
}
