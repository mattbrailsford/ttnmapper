(function(global){
    
    // Create a global event bus
    var eventBus = new Vue();

    Object.defineProperties(Vue.prototype, {
        $bus: {
            get: function () {
                return eventBus
            }
        }
    })

    // Map icons
    var markerIcons = {
        gateway: {
            url: 'img/marker_cloud.svg',
            anchor: new google.maps.Point(15, 38)
        },
        tracker: {
            path: google.maps.SymbolPath.CIRCLE,
            strokeColor: '#0d83d0',
            fillColor: '#ffffff',
            fillOpacity: 1,
            scale: 6
        }
    }

    // Api
    var api = {
        markerIcons: markerIcons
    }

    window.ttnmapper = window.ttnmapper || {};
    window.ttnmapper.common = window.ttnmapper.common || api;

})(window, );