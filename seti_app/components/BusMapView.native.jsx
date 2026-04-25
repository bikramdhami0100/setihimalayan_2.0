import React from 'react';
import { View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

export default function BusMapView({ region }) {
    return (
        <MapView
            style={{ flex: 1 }}
            provider={PROVIDER_DEFAULT}
            initialRegion={region}
            scrollEnabled={false}
            zoomEnabled={false}
        >
            <Marker
                coordinate={{ latitude: region.latitude, longitude: region.longitude }}
                title="Boarding Point"
                description="Kalanki Bus Stand"
            >
                <View style={{ backgroundColor: '#0f172a', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: 'white' }}>
                    <Ionicons name="bus" size={18} color="#38bdf8" />
                </View>
            </Marker>
        </MapView>
    );
}
