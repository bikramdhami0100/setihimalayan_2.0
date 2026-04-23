import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, Text, Button, Chip } from 'react-native-paper';
import { colors } from '../../utils/colors';
import { formatDateTime, formatCurrency } from '../../utils/helpers';

export default function SearchResultsScreen({ route, navigation }) {
  const { results, origin, destination, date } = route.params;

  const renderScheduleCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('SeatSelection', { schedule: item, origin, destination, date })}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium">{item.bus_number}</Text>
            <Chip mode="outlined" style={styles.busType}>{item.bus_type}</Chip>
          </View>
          <Text variant="bodyMedium">{item.origin} → {item.destination}</Text>
          <Text variant="bodySmall">Departure: {formatDateTime(item.departure_time)}</Text>
          <Text variant="bodySmall">Arrival: {formatDateTime(item.arrival_time)}</Text>
          <Text variant="bodySmall">Duration: {item.duration_minutes} min</Text>
          <Text variant="bodyLarge" style={styles.price}>{formatCurrency(item.base_price)}</Text>
          <Text variant="bodySmall">Available Seats: {item.available_seats}</Text>
          <Button mode="contained" style={styles.selectButton} buttonColor={colors.primary}>
            Select Seats
          </Button>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (!results || results.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="titleLarge">No buses found</Text>
        <Text variant="bodyMedium">Try different date or route</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderScheduleCard}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  card: { marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  busType: { borderColor: colors.secondary },
  price: { color: colors.primary, fontWeight: 'bold', marginTop: 8 },
  selectButton: { marginTop: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  backButton: { marginTop: 16 },
});