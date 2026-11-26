import { StyleSheet, Text, View } from 'react-native';

export type WalkingRoute = {
  coordinates: { latitude: number; longitude: number }[];
  distance: number;
  duration: number;
};

export type TripMapProps = {
  completed: number;
  traveling: boolean;
  showPosition: boolean;
  onPositionEnabled?: () => void;
  walkingRoute?: WalkingRoute;
};

export default function TripMap(_: TripMapProps) {
  return (
    <View style={styles.container}>
      <Text>Ouvre TravelBuddy sur Android ou iOS pour afficher la carte.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6ebe2',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
