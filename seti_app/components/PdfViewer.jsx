import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PdfViewer({ source, style }) {
    return (
        <View style={styles.fallbackContainer}>
            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
            <Text style={styles.fallbackText}>PDF Viewer is optimized for our mobile app</Text>
            <TouchableOpacity 
                style={styles.webButton}
                onPress={() => window.open(source.uri, '_blank')}
            >
                <Text style={styles.webButtonText}>Open PDF in New Tab</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    fallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    fallbackText: {
        marginTop: 16,
        color: '#64748b',
        fontSize: 14,
        textAlign: 'center',
    },
    webButton: {
        marginTop: 24,
        backgroundColor: '#0f172a',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    webButtonText: {
        color: 'white',
        fontWeight: 'bold',
    }
});
