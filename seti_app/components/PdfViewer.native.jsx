import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export default function PdfViewer({ source, style }) {
  const pdfUri = source?.uri || '';
  const googleDocsUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUri)}`;

  return (
    <WebView
      source={{ uri: googleDocsUrl }}
      style={[styles.webview, style]}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
  },
});
