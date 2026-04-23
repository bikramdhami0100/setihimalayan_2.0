import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { getSeatLayout } from '../../api/schedules';
import { useBookingStore } from '../../store/bookingStore';
import { useSocket, joinScheduleRoom, leaveScheduleRoom } from '../../hooks/useSocket';
import { colors } from '../../utils/colors';
import { generateSeatGrid, getSeatStatus, getSeatColor } from '../../utils/helpers';

export default function SeatSelectionScreen({ route, navigation }) {
  const { schedule, origin, destination, date } = route.params;
  const [layout, setLayout] = useState(null);
  const [lockedSeats, setLockedSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const { selectedSeats, setSelectedSeats, clearSelectedSeats } = useBookingStore();
  const { socket } = useSocket(schedule.id);

  useEffect(() => {
    fetchSeatLayout();
    joinScheduleRoom(schedule.id);
    return () => {
      leaveScheduleRoom(schedule.id);
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('seats-locked', (data) => {
        if (data.scheduleId === schedule.id) {
          setLockedSeats(prev => [...new Set([...prev, ...data.seats])]);
        }
      });
      socket.on('seats-booked', (data) => {
        if (data.scheduleId === schedule.id) {
          setBookedSeats(prev => [...new Set([...prev, ...data.seats])]);
          setLockedSeats(prev => prev.filter(s => !data.seats.includes(s)));
        }
      });
      socket.on('seats-released', (data) => {
        if (data.scheduleId === schedule.id) {
          setLockedSeats(prev => prev.filter(s => !data.seats.includes(s)));
        }
      });
    }
  }, [socket, schedule.id]);

  const fetchSeatLayout = async () => {
    try {
      const res = await getSeatLayout(schedule.id);
      const data = res.data.data;
      setLayout(JSON.parse(data.seat_layout));
      setLockedSeats(data.locked_seats || []);
      setBookedSeats(data.booked_seats || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load seat layout');
    } finally {
      setLoading(false);
    }
  };

  const toggleSeat = (seatNum) => {
    const status = getSeatStatus(seatNum.toString(), lockedSeats, bookedSeats, selectedSeats);
    if (status === 'available') {
      if (selectedSeats.includes(seatNum.toString())) {
        setSelectedSeats(selectedSeats.filter(s => s !== seatNum.toString()));
      } else {
        setSelectedSeats([...selectedSeats, seatNum.toString()]);
      }
    } else {
      Alert.alert('Seat Unavailable', `Seat ${seatNum} is already ${status}`);
    }
  };

  const proceedToDetails = () => {
    if (selectedSeats.length === 0) {
      Alert.alert('No Seats', 'Please select at least one seat');
      return;
    }
    navigation.navigate('BookingConfirmation', {
      schedule,
      selectedSeats,
      origin,
      destination,
      date,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const seatGrid = generateSeatGrid(schedule.total_seats, 4);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: getSeatColor('available') }]} /><Text>Available</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: getSeatColor('selected') }]} /><Text>Selected</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: getSeatColor('locked') }]} /><Text>Locked</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: getSeatColor('booked') }]} /><Text>Booked</Text></View>
        </View>
        {seatGrid.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((seatNum, colIdx) => {
              if (!seatNum) return <View key={colIdx} style={styles.emptySeat} />;
              const status = getSeatStatus(seatNum.toString(), lockedSeats, bookedSeats, selectedSeats);
              return (
                <TouchableOpacity
                  key={colIdx}
                  style={[styles.seat, { backgroundColor: getSeatColor(status) }]}
                  onPress={() => toggleSeat(seatNum)}
                  disabled={status !== 'available'}
                >
                  <Text style={styles.seatText}>{seatNum}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Text variant="titleMedium">Selected: {selectedSeats.join(', ') || 'None'}</Text>
        <Button mode="contained" onPress={proceedToDetails} style={styles.proceedButton}>
          Continue
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16 },
  legend: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendBox: { width: 20, height: 20, borderRadius: 4, marginRight: 8 },
  row: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  seat: { width: 50, height: 50, margin: 4, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  emptySeat: { width: 50, height: 50, margin: 4 },
  seatText: { color: '#fff', fontWeight: 'bold' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  proceedButton: { marginTop: 8 },
});