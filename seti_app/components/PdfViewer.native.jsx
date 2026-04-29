import React from 'react';
import Pdf from 'react-native-pdf';

export default function PdfViewer({ source, style }) {
    return (
        <Pdf
            source={source}
            onLoadComplete={(numberOfPages, filePath) => {
                console.log(`Number of pages: ${numberOfPages}`);
            }}
            onPageChanged={(page, numberOfPages) => {
                console.log(`Current page: ${page}`);
            }}
            onError={(error) => {
                console.log(error);
            }}
            onPressLink={(uri) => {
                console.log(`Link pressed: ${uri}`);
            }}
            style={style}
        />
    );
}
// use this component instead of WebView to display PDF files in React Native. The Pdf component from react-native-pdf provides better performance and more features for handling PDF files compared to using a WebView.

//   <WebView
//             source={{ uri: source.uri }}
//             style={style}
//             javaScriptEnabled={true}
//             domStorageEnabled={true}
//             startInLoadingState={true}
//             scalesPageToFit={true}
//         />
