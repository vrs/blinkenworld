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
map.zoomToMaxExtent();

document.addEventListener('DOMContentLoaded', function (){
    var markersLayer = new OpenLayers.Layer.Markers('Countryballs');
    var iconSize =  new OpenLayers.Size(17, 14);
    var iconOffset = new OpenLayers.Pixel(-(iconSize.w/2), -iconSize.h);

    var req = new XMLHttpRequest();  
        req.open('GET', 'http://krautchan.net/ajax/geoip/lasthour', false);   
        req.send(null);  

    if(req.status == 200) {
        intData = JSON.parse(req.responseText)["data"];
    };

    for (i in intData) {
        var lon = intData[i][1];
        var lat = intData[i][2];
        var iconURL = 'http://krautchan.net/images/balls/' + intData[i][0] + '.png';
    
        var marker = new OpenLayers.Marker(
            new OpenLayers.LonLat(lon, lat),
            new OpenLayers.Icon(iconURL, iconSize, iconOffset)
        );
        
        markersLayer.addMarker(marker);
    };

    map.addLayer(markersLayer);
    markersLayer.setVisibility(true);
}, false);
