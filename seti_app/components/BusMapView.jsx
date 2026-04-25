import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BusMapView({ region }) {
    return (
        <View style={styles.container}>
            <Ionicons name="map-outline" size={48} color="#cbd5e1" />
            <Text style={styles.text}>Interactive map available on mobile app</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        marginTop: 8,
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '500',
    }
});
