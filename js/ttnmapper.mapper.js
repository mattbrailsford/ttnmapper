(function(global, Vue, _, undefined){

    // ========================================================
    // Variables
    // ========================================================
    var vm;
    var options = {
        mqtt: {
            host: "",
            port: 1883,
            username: "",
            password: "",
            ssl: true,
            topic: "+/devices/+/up"
        }
    }

    var golocationOpts = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    }

    // ========================================================
    // App
    // ========================================================
    var init = function(el, o){
        
        var data = _.defaultsDeep({
            status: "ready"
        }, o, options);

        vm = new Vue({
            el: el,
            data: data,
            created: function(){

                var self = this;

                self.client = new MqttClient({
                    host : self.mqtt.host,
                    port : self.mqtt.port,
                    username: self.mqtt.username,
                    password: self.mqtt.password,
                    ssl: self.mqtt.ssl
                })
                .on("connect", function(){
                    
                    // Subscribe to topic
                    self.client.subscribe(self.mqtt.topic, function(e, g){
                        if (e){
                            self.status = "error";
                            self.client.disconnect();
                            console.log("ERROR "+ e);
                        } else {
                            
                            // Check we can get current position
                            navigator.geolocation.getCurrentPosition(function(pos){
                                self.status = "connected"; 
                            }, function(err){
                                self.status = "error";
                                self.client.disconnect();
                                console.log("ERROR "+ err.code +": "+ err.message);
                            }, golocationOpts);

                        }
                    })

                })
                .on('disconnect', function() {
                    if (self.status != "error"){
                        self.status = "ready";
                    }
                })
                .on('connecting', function(){
                    self.status = "connecting";
                })
                .on('message', function(topic, data, message){
                    var payload = JSON.parse(data);
                    var payloadDate = moment(payload.metadata.time);

                    console.log(payload);

                    // Add / update any gateways
                    _.forEach(payload.metadata.gateways, function(g){

                        // Store gateway
                        var gatewayRef = self.db.ref('gateways/'+ g.gtw_id);
                        gatewayRef.transaction(function(current) {

                            if (!current) {
                                current = {
                                    gtw_id: g.gtw_id
                                };
                            }

                            if (g.hasOwnProperty('latitude') && g.hasOwnProperty('longitude')){
                                current.lat = g.latitude;
                                current.lng = g.longitude;
                            } else {
                                delete current.lat;
                                delete current.lng;
                            }

                            if (g.hasOwnProperty('altitude')){
                                current.alt = g.altitude;
                            } else {
                                delete current.alt;
                            }

                            return current;
                        });

                    });

                    navigator.geolocation.getCurrentPosition(function(pos){

                        // If there were previously any errors, 
                        // set the status back to connected
                        self.status = "connected";

                        // Get the best samples from the list of gateways
                        var bestSnrGateway = _.maxBy(payload.metadata.gateways, 'snr');
                        var bestRssiGateway = _.maxBy(payload.metadata.gateways, 'rssi');

                        // Calculate the tile coords
                        var tileCoords = ttnmapper.util.fromLatLngToTile({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude
                        });

                        // Store / update the tile
                        var tileId = "x_" + tileCoords.x + "_y_" + tileCoords.y;
                        var tileRef = self.db.ref('tiles/'+ tileId);
                        tileRef.transaction(function(current) {

                            if (!current) {
                                current = {
                                    x: tileCoords.x,
                                    y: tileCoords.y,
                                    avg_snr: bestSnrGateway.snr,
                                    avg_rssi: bestRssiGateway.rssi,
                                    gateways: {},
                                    timestamp: payloadDate.valueOf()
                                };
                            } else {
                                // EMA = (sample * alpha) + (Prev EMA * (1 - alpha))
                                var alpha = 0.2;
                                current.avg_snr = ((bestSnrGateway.snr * alpha) + (current.avg_snr * (1 - alpha)));
                                current.avg_rssi = ((bestRssiGateway.rssi * alpha) + (current.avg_rssi * (1 - alpha)));
                            }

                            // Add gateway id's to gateways collection
                            _.forEach(payload.metadata.gateways, function(g){
                                if (!current.gateways.hasOwnProperty(g.gtw_id)){
                                    current.gateways[g.gtw_id] = true;
                                }
                            })

                            return current;
                        });
                      
                        // Append the sample to the samples collection
                        var sampleId = payload.dev_id + "_" + payloadDate.format('x');
                        var sampleRef = self.db.ref('samples/' + sampleId);
                        sampleRef.set({
                            tile_id: tileId,
                            dev_id: payload.dev_id,
                            app_id: payload.app_id,
                            freq: payload.metadata.frequency,
                            data_rate: payload.metadata.data_rate,
                            coing_rate: payload.metadata.coding_rate,
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            acc: pos.coords.accuracy,                            
                            gateways: _.keyBy(_.map(payload.metadata.gateways, function(g){
                                return {
                                    gtw_id: g.gtw_id,
                                    rssi: g.rssi,
                                    snr: g.snr,
                                    channel: g.channel,
                                    rf_chain: g.rf_chain,
                                    timestamp: g.timestamp
                                }
                            }), function(g){
                                return g.gtw_id;
                            }),
                            timestamp: payloadDate.valueOf()
                        });

                    });

                }, function(err){
                    self.status = "warning";
                    console.log("ERROR "+ err.code +": "+ err.message);
                }, golocationOpts);
                                
                if (!navigator.geolocation) {
                    self.status = "error";
                    console.log("ERROR Browser does not support gelocation");
                }

                self.db = firebase.database();
            },
            methods: {

                toggleConnection: function(){

                    var self = this;

                    if (self.status != "connecting" && self.status != "connected"){
                        self.connect();
                    }

                    if(self.status == "connected"){
                        self.disconnect();
                    }

                },
                connect: function(){
                    this.client.connect();
                },
                disconnect: function(){
                    this.client.disconnect();
                }

            },
            computed: {

                buttonIcon: function(){
                    
                    var self = this;

                    switch(self.status){
                        case "connected":
                            return "signal_wifi_4_bar";
                        default:
                            return "signal_wifi_off";
                    }

                }

            }
        })

    }

    // Export
    global.ttnmapper = global.ttnmapper || {};
    global.ttnmapper.mapper = global.ttnmapper.mapper || {
        init: init
    };

})(window, Vue, _);