(function(){

    'use strict';

    // zoom level 18 eq tile size of 90.5m2
    // calculate scale from zoom as 1 << zoom
    // -- 
    // result scale would be 262144 which creates 
    // a tile size approx 90.75m2. To get closer
    // too 100m2, trial and error dictates -24225
    // gets us to tile size 99.999896771548m2

    var TILE_SIZE = 256;
    var TILE_SCALE = 237919;

    var pixelOrigin_ = {x: TILE_SIZE / 2, y: TILE_SIZE / 2};
    var pixelsPerLonDegree_ = TILE_SIZE / 360;
    var pixelsPerLonRadian_ = TILE_SIZE / (2 * Math.PI);

    // ========================================================
    // Private
    // ========================================================
    function _bound(value, opt_min, opt_max) {
        if (opt_min != null) value = Math.max(value, opt_min);
        if (opt_max != null) value = Math.min(value, opt_max);
        return value;
    }
    
    function _degreesToRadians(deg) {
        return deg * (Math.PI / 180);
    }
    
    function _radiansToDegrees(rad) {
        return rad / (Math.PI / 180);
    }

    // ========================================================
    // Public
    // ========================================================
    function fromLatLngToWorld(latLng, opt_point) {
        var point = {x: null, y: null};
        var origin = pixelOrigin_;
        
        point.x = origin.x + latLng.lng * pixelsPerLonDegree_;
        
        // Truncating to 0.9999 effectively limits latitude to 89.189. This is
        // about a third of a tile past the edge of the world tile.
        var siny = _bound(Math.sin(_degreesToRadians(latLng.lat)), -0.9999, 0.9999);
        point.y = origin.y + 0.5 * Math.log((1 + siny) / (1 - siny)) * -pixelsPerLonRadian_;
        
        return point;
    };
    
    function fromWorldToLatLng(point) {
        var origin = pixelOrigin_;
        var lng = (point.x - origin.x) / pixelsPerLonDegree_;
        var latRadians = (point.y - origin.y) / -pixelsPerLonRadian_;
        var lat = _radiansToDegrees(2 * Math.atan(Math.exp(latRadians)) - Math.PI / 2);
        
        return {lat: lat, lng: lng};
    };

    var fromLatLngToTile = function(latLng) {

        // First convert to world coord
        var worldCoord = fromLatLngToWorld(latLng);

        // Now convert to tile coord
        var tileCoord = {
            x: Math.floor(worldCoord.x * TILE_SCALE / TILE_SIZE),
            y: Math.floor(worldCoord.y * TILE_SCALE / TILE_SIZE)
        };

        return tileCoord;
    }

    var fromTileToLatLng = function(point){

        // First convert to world coord
        var worldCoord = {
            x: point.x / TILE_SCALE * TILE_SIZE,
            y: point.y / TILE_SCALE * TILE_SIZE
        };

        // Now convert to lat lng
        var latLng = fromWorldToLatLng(worldCoord);

        return latLng;
    }

    var getTitleLatLngBounds = function(nwPoint){

        // Get the next tile coords + 1 along
        var sePoint = {
            x: nwPoint.x + 1,
            y: nwPoint.y + 1
        };

        // Convert coords to lat lng
        var nw = fromTileToLatLng(nwPoint);
        var se = fromTileToLatLng(sePoint);

        return {
            north: nw.lat,
            west: nw.lng,
            south: se.lat, 
            east: se.lng
        }

    }

    // Export API
    var api = {
        fromLatLngToWorld: fromLatLngToWorld,
        fromWorldToLatLng: fromWorldToLatLng,
        fromLatLngToTile: fromLatLngToTile,
        fromTileToLatLng: fromTileToLatLng,
        getTitleLatLngBounds: getTitleLatLngBounds
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        window.ttnmapper = window.ttnmapper || {};
        window.ttnmapper.util = window.ttnmapper.util || api;
    }

})();