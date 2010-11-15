var map = new OpenLayers.Map(
    'map',
    {maxResolution: 0.703125}
);

var wmscURL = [
    "http://wmsc1.terrapages.net/getmap?",
    "http://wmsc2.terrapages.net/getmap?",
    "http://wmsc3.terrapages.net/getmap?",
    "http://wmsc4.terrapages.net/getmap?"
];
var terrapagesStreetLayer = new OpenLayers.Layer.WMS(
    'TerraPages Street',
    wmscURL,
    {
        layers: 'UnprojectedStreet',
        format: 'image/jpeg'
    },
    {
        buffer: 1,
        isBaseLayer: true
    }
);
map.addLayer(terrapagesStreetLayer);

map.setCenter(new OpenLayers.LonLat(12, 50), 0);
map.zoomTo(3);

document.addEventListener('DOMContentLoaded', function (){
    var markersLayer = new OpenLayers.Layer.Markers('Countryballs');
    var iconSize =  new OpenLayers.Size(17, 14);
    var iconOffset = new OpenLayers.Pixel(-(iconSize.w/2), -iconSize.h);

    var Austria     = [16, 48, 'at.png'];
    var Bavaria     = [11, 48, 'bavaria.png'];
    var Denmark     = [10, 56, 'dk.png'];
    var France      = [ 3, 46, 'fr.png'];
    var Germany     = [12, 52, 'de.png'];
    var Netherlands = [ 6, 52, 'nl.png'];
    var Poland      = [21, 52, 'pl.png'];
    var Switzerland = [ 8, 46, 'ch.png'];
    
    var Countryballs = [Austria, Bavaria, Denmark, France, Germany, Netherlands, Poland, Switzerland];
    
    for (i in Countryballs) {
        var lon = Countryballs[i][0];
        var lat = Countryballs[i][1];
        var iconURL = 'img/countryballs/' + Countryballs[i][2];
    
        var marker = new OpenLayers.Marker(
            new OpenLayers.LonLat(lon, lat),
            new OpenLayers.Icon(iconURL, iconSize, iconOffset)
        );
        
        markersLayer.addMarker(marker);
    };

    map.addLayer(markersLayer);
    markersLayer.setVisibility(true);
}, false);
