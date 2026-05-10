import React from 'react';
import { StyleSheet, Dimensions, View, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import PdfViewer from '../../components/PdfViewer';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

export default function TicketPdf() {
    const { url } = useLocalSearchParams();
    const source = { uri: url || 'http://samples.leanpub.com/thereactnativebook-sample.pdf', cache: true };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.title}>E-Ticket PDF</Text>
                <TouchableOpacity style={styles.downloadButton}>
                    <Ionicons name="download-outline" size={24} color="#0f172a" />
                </TouchableOpacity>
            </View>

            <View style={styles.pdfContainer}>
                <PdfViewer source={source} style={styles.pdf} />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    downloadButton: {
        padding: 4,
    },
    pdfContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    pdf: {
        flex: 1,
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    }
});
