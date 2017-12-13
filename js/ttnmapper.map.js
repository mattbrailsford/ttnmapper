(function(global, Vue, _, undefined){

    // ========================================================
    // Variables
    // ========================================================
    var vm;
    var options = { }

    var gatewayIcon = {
        url: 'img/marker_cloud.svg',
        anchor: new google.maps.Point(15, 38)
    }

    var sampleIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        strokeColor: '#0d83d0',
        fillColor: '#ffffff',
        scale: 6
    }

    var heatMapColourScale = new Rainbow();
    heatMapColourScale.setSpectrum('2254f4','e6007c','f9bc26');
    heatMapColourScale.setNumberRange(-15, 10);

    // ========================================================
    // Map Info Bubble
    // ========================================================
    Vue.component('ttnInfoBubble', {
        props: ["map", "model"],
        data: function() {
            return {
                content: ""
            }  
        },
        created: function () {

            var self = this;

            // Create the info bubble
            self.infoBubble = new InfoBubble({
                content: '',
                position: new google.maps.LatLng(-35, 151),
                shadowStyle: 1,
                padding: 0,
                borderRadius: 0,
                backgroundColor: "#0d83d0",
                arrowSize: 10,
                arrowStyle: 0,
                borderWidth: 0,
                disableAutoPan: true,
                hideCloseButton: true,
                backgroundClassName: 'ttn-info-bubble__bg',
                disableAnimation: true,
                maxWidth: 350,
                minWidth: 350,
                zIndex: 20
            });

            // Wrap settings in function for easier redrawing later
            self.drawInfoBubble = function () {

                var content = '<div class="ttn-info-bubble__content">';

                if (self.model.type == 'tile'){
                    content += '<div class="ttn-info-bubble__heading">Tile Info</div>';
                    content += '<table>';
                    content += '<tr><th>avg_rssi:</th><td>'+ self.model.avg_rssi +'</td></tr>';
                    content += '<tr><th>avg_snr:</th><td>'+ self.model.avg_snr +'</td></tr>';
                    content += '<tr><th>gtw_ids:</th><td>';
                    _.forEach(_.keys(self.model.gateways), function(key, idx){
                        content += key +'<br />';
                    });
                    content += '</td></tr>';
                    content += '<tr><th>timestamp:</th><td>'+ self.model.timestamp +'</td></tr>';
                    content += '</table>';
                } else if (self.model.type == 'gateway') {
                    content += '<div class="ttn-info-bubble__heading">Gateway Info</div>';
                    content += '<table>';
                    content += '<tr><th>gtw_id:</th><td>'+ self.model.gtw_id +'</td></tr>';
                    content += '</table>';
                }
                content += '</div>';

                self.infoBubble.setContent(content);

                if (self.model.type == 'tile'){
                    var latLng = ttnmapper.util.fromTileToLatLng({ x:self.model.x + 0.5, y:self.model.y + 0.5});
                    self.infoBubble.setBubbleOffset(0, 0);
                    self.infoBubble.setPosition(new google.maps.LatLng(latLng.lat, latLng.lng));
                } else if (self.model.type == 'gateway'){
                    self.infoBubble.setBubbleOffset(0, -40);
                    self.infoBubble.setPosition(new google.maps.LatLng(self.model.lat, self.model.lng));
                }
                
                self.infoBubble.open(self.map);
            }

            google.maps.event.addListener(self.infoBubble, 'closeclick', function () {
                self.$bus.$emit("item-selected", undefined);
            });

            self.drawInfoBubble();

        },
        watch: {
            model: function () {
                this.drawInfoBubble();
            }
        },
        render: function () {
            // We need a render function but 
            // we don't actually need to do anything in it 
        },
        destroyed: function () {

            var self = this;
            google.maps.event.clearInstanceListeners(self.infoBubble);
            self.infoBubble.setMap(null);

        }
    });

    // ========================================================
    // Map Tile
    // ========================================================
    Vue.component('ttnMapTile', {
        props: ["map", "tile"],
        computed: {
            samples: function(){
                return this.tile.samples;
            }
        },
        created: function () {

            var self = this;

            // Create the tile
            self.mapTile = new google.maps.Rectangle();

            // Wrap settings in function for easier redrawing later
            self.drawTile = function () {

                var tileBounds = ttnmapper.util.getTitleLatLngBounds(self.tile);
                var colour = heatMapColourScale.colourAt(self.tile.avg_snr);

                console.log(self.tile.avg_snr, colour);

                var opts = {
                    bounds: tileBounds,
                    map: self.map,
                    strokeWeight: 0,
                    fillColor: '#' + colour,
                    fillOpacity: 0.75,
                    zIndex: 15
                }

                self.mapTile.setOptions(opts);
            }

            // Listen for map events
            google.maps.event.addListener(self.mapTile, 'click', function () {
                self.$bus.$emit("item-selected", self.tile);
            });

            self.drawTile();

        },
        watch: {
            
            tile: function () {
                this.drawTile();
            },
            samples: function(){
                this.drawTile();
            }

        },
        render: function () {
            // We need a render function but 
            // we don't actually need to do anything in it 
        },
        destroyed: function () {

            var self = this;
            google.maps.event.clearInstanceListeners(self.mapTile);
            self.mapTile.setMap(null);

        }
    });

    // ========================================================
    // Map Marker
    // ========================================================
    Vue.component('ttnMapMarker', {
        props: ["map", "model", "type"],
        created: function () {

            var self = this;

            // Create the marker
            self.mapMarker = new google.maps.Marker();

            // Wrap settings in function for easier redrawing later
            self.drawMarker = function () {

                var opts = {
                    position: {
                        lat: self.model.lat,
                        lng: self.model.lng
                    },
                    map: self.map,
                    zIndex: 15
                }

                if (self.type == 'gateway'){
                    opts.icon = gatewayIcon;
                } else {
                    opts.icon = sampleIcon;
                }

                self.mapMarker.setOptions(opts);
            }

            // Listen for map events
            google.maps.event.addListener(self.mapMarker, 'click', function () {
                self.$bus.$emit("item-selected", self.model);
            });

            self.drawMarker();

        },
        watch: {
            model: function () {
                this.drawMarker();
            }
        },
        render: function () {
            // We need a render function but 
            // we don't actually need to do anything in it 
        },
        destroyed: function () {

            var self = this;
            google.maps.event.clearInstanceListeners(self.mapMarker);
            self.mapMarker.setMap(null);

        }
    });

    // ========================================================
    // Map
    // ========================================================
    Vue.component('ttnMap', {
        template: '#ttn-map',
        props: ["gateways", "tiles"],
        data: function () {
            return {
                map: undefined,
                gatewaysInView: [],
                tilesInView: [],
                selectedItem: undefined,
                isReady: false
            }
        },
        computed: {

            gatewaysWithLatLng: function(){

                var self = this;
                return _.filter(this.gateways, function(g){
                    return g.hasOwnProperty('lat') && g.hasOwnProperty('lng');
                });

            }

        },
        created: function(){

            var self = this;
            
            self.$bus.$on('item-selected', function(newValue){
                self.selectedItem = newValue;
            });

            self.calculateGatewaysInView = function(){

                var self = this;
                if (!self.map){
                    self.gatewaysInView = [];
                    return;
                }

                var bounds = self.map.getBounds();
                self.gatewaysInView = _.filter(self.gatewaysWithLatLng, function(g){
                    return bounds.contains({
                        lat: g.lat,
                        lng: g.lng
                    });
                });

            }

            self.calculateTilesInView = function(){
                
                var self = this;
                if (!self.map){
                    self.tilesInView = [];
                    return;
                }

                var bounds = self.map.getBounds();
                var ne = bounds.getNorthEast();
                var sw = bounds.getSouthWest();

                var nw = { lat: ne.lat(), lng: sw.lng() };
                var se = { lat: sw.lat(), lng: ne.lng() };

                var nwTile = ttnmapper.util.fromLatLngToTile(nw);
                var seTile = ttnmapper.util.fromLatLngToTile(se);

                self.tilesInView = _.filter(self.tiles, function(t){
                    return t.x >= nwTile.x && t.x <= seTile.x && t.y >= nwTile.y && t.y <= seTile.y;
                });

            }

        },
        mounted: function () {

            var self = this;

            self.$mapEl = document.getElementById("ttn-map-instance");

            // Create the map
            var styledMap = new google.maps.StyledMapType([
				{
				    "stylers": [
                        { "saturation": -100 },
                        { "lightness": 19 },
                        { "gamma": 1 }
				    ]
				},{
				    "featureType": "poi",
				    "stylers": [
						{ "visibility": "off" }
				    ]
				},
				{
				    "featureType": "landscape.man_made",
				    "stylers": [
						{ "visibility": "off" }
				    ]
				}
            ], { name: "TTN" });

            var defaultPosition = { lat: 53.700488, lng: -1.529541 };
            var defaultZoom = 8;

            self.map = new google.maps.Map(self.$mapEl, {
                zoom: defaultZoom,
                zoomControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_TOP
                },
                streetViewControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_TOP
                },
                mapTypeControlOptions: {
                    position: google.maps.ControlPosition.LEFT_TOP
                }
            });

            self.map.mapTypes.set('ttnmapper', styledMap);
            self.map.setMapTypeId('ttnmapper');

            // Setup map event handlers
            google.maps.event.addListener(self.map, 'click', function () {
                self.$bus.$emit("item-selected", undefined);
            });
            
            google.maps.event.addListener(self.map, 'idle', function () {
                if (!self.isReady){
                    self.map.setZoom(defaultZoom);
                    self.map.setCenter(defaultPosition);
                    self.isReady = true;
                    self.$emit("map-ready");  
                }
                self.calculateGatewaysInView();
                self.calculateTilesInView();
            });

        },
        watch: {
            tiles: function(){
                var self = this;
                self.calculateGatewaysInView();
                self.calculateTilesInView();
            },
            tiles: function(){
                var self = this;
                self.calculateGatewaysInView();
                self.calculateTilesInView();
            }
        },
        destroyed: function () {
            google.maps.event.clearInstanceListeners(self.map);
            self.$bus.$off('item-selected');
        }
    });

    // ========================================================
    // App
    // ========================================================
    var init = function(el, o){
        
        var data = _.defaultsDeep({
            tiles: [],
            gateways: []
        }, o, options);

        vm = new Vue({
            el: el,
            data: data,
            created: function(){

                var self = this;

                self.db = firebase.database();

                // Setup listeners for gateways
                var gatewaysRef = self.db.ref('gateways');
                gatewaysRef.on('child_added', function(data){
                    var g = data.val();
                    g.$key = data.key;
                    g.type = 'gateway';
                    self.gateways.push(g);
                });
                gatewaysRef.on('child_changed', function(data){
                    var g = data.val();
                    g.$key = data.key;
                    g.type = 'gateway';
                    var idx = _.findIndex(self.gateways, { $key: data.key });
                    if (idx >= 0){
                        self.gateways.splice(idx, 1, g);
                    }
                });
                gatewaysRef.on('child_removed', function(data){
                    var idx = _.findIndex(self.gateways, { $key: data.key });
                    if (idx >= 0){
                        self.gateways.splice(idx, 1);
                    }
                });

                // Setup listeners for tiles
                var tilesRef = self.db.ref('tiles')
                tilesRef.on('child_added', function(data){
                    console.log("Tile added");
                    var t = data.val();
                    t.$key = data.key;
                    t.type = 'tile';
                    self.tiles.push(t);

                    console.log(self.tiles);
                });
                tilesRef.on('child_changed', function(data){
                    console.log("Tile changed");
                    var t = data.val();
                    t.$key = data.key;
                    t.type = 'tile';
                    var idx = _.findIndex(self.tiles, { $key: data.key });
                    if (idx >= 0){
                        self.tiles.splice(idx, 1, t);
                    }
                });
                tilesRef.on('child_removed', function(data){
                    console.log("Tile deleted");
                    var idx = _.findIndex(self.tiles, { $key: data.key });
                    if (idx >= 0){
                        self.tiles.splice(idx, 1);
                    }
                });

            }
        })

    }

    // Export
    global.ttnmapper = global.ttnmapper || {};
    global.ttnmapper.map = global.ttnmapper.map || {
        init: init
    };

})(window, Vue, _);