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
