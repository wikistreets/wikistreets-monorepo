const escapeXml = (unsafe) => {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

const photosKml = (photos, imageBaseUrl) => {
    let kml = `
    <ExtendedData>
        <Data name="gx_media_links">
`;
        photos.map( photo => {
            kml += `
            <value><![CDATA[${imageBaseUrl}/${photo.filename}]]></value>
`;
        });

        kml += `
        </Data>
    </ExtendedData>
`;
    return kml;
}

const placeMarkKml = (place, imageBaseUrl) => {
    // clean up some data
    const address = escapeXml(place.address);
    const sidewalkIssues = place.sidewalkIssues.length ? `sidewalk issues: ${escapeXml(place.sidewalkIssues.join(", "))}<br /><br />` : '';
    const roadIssues = place.roadIssues.length ? `street issues: ${escapeXml(place.roadIssues.join(", "))}<br /><br />` : '';
    const comments = place.comments ? `${escapeXml(place.comments)}<br /><br />` : '';

    let photos = '';
    let mainPhotoTag = '';

    if (place.photos.length) {
        mainPhotoTag = `<img src="${imageBaseUrl}/${place.photos[0].filename}" height="200" width="auto" /><br /><br />`;
        photos = photosKml(place.photos, imageBaseUrl); // get kml for photos
    } // if photos.length

    let res = `
<Placemark>
    <name>${address}</name>
    <description><![CDATA[${mainPhotoTag}${sidewalkIssues}${roadIssues}${comments}${place.date}]]></description>
    ${photos}
    <Point>
        <coordinates>
        ${place.position.lng},${place.position.lat}
        </coordinates>
    </Point>
</Placemark>
`;
    return res;
}

const kmlGenerator = (data, imageBaseUrl) => {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
    <name>wikistreets</name>
    <description/>
`

    data.map( (point, i, arr) => {
        kml += placeMarkKml(point, imageBaseUrl);
    });

    kml += `
    </Document>
</kml>
`;

    return kml;

}

module.exports = kmlGenerator;