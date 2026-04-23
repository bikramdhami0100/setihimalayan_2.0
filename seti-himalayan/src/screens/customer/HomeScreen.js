import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { useSearch } from '../../hooks/useSearch';
import { getPopularRoutes } from '../../api/reports';
import { colors } from '../../utils/colors';
import { formatDate } from '../../utils/helpers';

export default function HomeScreen({ navigation }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [popularRoutes, setPopularRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const { search, isLoading } = useSearch();

  useEffect(() => {
    fetchPopularRoutes();
  }, []);

  const fetchPopularRoutes = async () => {
    setLoadingRoutes(true);
    try {
      const res = await getPopularRoutes();
      setPopularRoutes(res.data.data.routes || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleSearch = async () => {
    if (!origin || !destination || !date) {
      alert('Please fill all fields');
      return;
    }
    const result = await search(origin, destination, date);
    if (result.success) {
      navigation.navigate('SearchResults', { results: result.results, origin, destination, date });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Where to?</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Find your next journey with Seti Himalayan</Text>
      </View>

      <Card style={styles.searchCard}>
        <Card.Content>
          <TextInput
            mode="outlined"
            label="From"
            value={origin}
            onChangeText={setOrigin}
            left={<TextInput.Icon icon="map-marker" />}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="To"
            value={destination}
            onChangeText={setDestination}
            left={<TextInput.Icon icon="map-marker" />}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Travel Date"
            value={date ? formatDate(date, 'YYYY-MM-DD') : ''}
            onFocus={() => setShowCalendar(true)}
            left={<TextInput.Icon icon="calendar" />}
            style={styles.input}
          />
          {showCalendar && (
            <Calendar
              onDayPress={(day) => {
                setDate(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={{ [date]: { selected: true, selectedColor: colors.primary } }}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{ selectedDayBackgroundColor: colors.primary }}
            />
          )}
          <Button
            mode="contained"
            onPress={handleSearch}
            loading={isLoading}
            disabled={isLoading}
            style={styles.searchButton}
            buttonColor={colors.primary}
          >
            Search Buses
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.popularSection}>
        <Text variant="titleLarge" style={styles.sectionTitle}>Popular Routes</Text>
        {loadingRoutes ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {popularRoutes.map((route) => (
              <Chip
                key={route.route_id}
                mode="outlined"
                onPress={() => {
                  setOrigin(route.origin);
                  setDestination(route.destination);
                }}
                style={styles.chip}
              >
                {route.origin} → {route.destination}
              </Chip>
            ))}
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  title: { color: colors.primary, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, marginTop: 4 },
  searchCard: { margin: 16, elevation: 4, backgroundColor: colors.surface },
  input: { marginBottom: 12, backgroundColor: colors.surface },
  searchButton: { marginTop: 8, paddingVertical: 6 },
  popularSection: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { marginBottom: 12, color: colors.text },
  chipScroll: { flexDirection: 'row' },
  chip: { marginRight: 8, marginBottom: 8, borderColor: colors.primary },
});