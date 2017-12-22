(function(global, Vue, _, undefined){

    // ========================================================
    // Variables
    // ========================================================
    var geolocationOpts = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    }

    // ========================================================
    // Mapper
    // ========================================================
    Vue.component('ttnMapper', {
        props: ["mqttConfig", "map"],
        template: "#ttn-mapper",
        data: function(){
            return {
                samplePoints: [],
                currentPos: undefined,
                status: "ready"
            }
        },
        watch: {
            map: function(newValue){
                if (newValue){
                    this.initButton();
                } else {
                    this.destroyButton();
                }
            },
            status: function(newValue, oldValue){

                var self = this;

                if (newValue && self.button){
                    self.button.addClass(newValue);
                    self.button.text(newValue == "connected" ? "signal_wifi_4_bar" : "signal_wifi_off");
                    if (oldValue){
                        self.button.removeClass(oldValue);
                    }
                }

                if (newValue == "connected"){
                    self.noSleep.enable();
                } else if (newValue == "ready" || newValue == "error"){
                    self.noSleep.disable();
                }
                
            },
            currentPos: function(newValue, oldValue){
                
                var self = this;

                if (newValue && !oldValue && self.map){
                    self.map.setZoom(14);
                    self.map.setCenter(self.currentPos);
                }

            }
        },
        created: function(){

            var self = this;
            
            self.noSleep = new NoSleep();
            
            self.initButton = function(){
                self.button = $("<button class='material-icons ttn-button ready'>signal_wifi_off</button>");
                self.map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(self.button.get(0));
            
                self.button.on("click", function () {
                    self.toggleConnection();
                });
            }

            self.destroyButton = function(){
                self.button.off("click");
            }
            
            self.client = new MqttClient({
                host : self.mqttConfig.host,
                port : self.mqttConfig.port,
                username: self.mqttConfig.username,
                password: self.mqttConfig.password,
                ssl: self.mqttConfig.ssl
            })
            .on("connect", function(){
                
                // Setup geo watcher
                var geoWatcherInited = false;
                self.geoWatcher = navigator.geolocation.watchPosition(function(pos){
                    
                    self.currentPos = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        acc: pos.coords.accuracy
                    };

                    if (!geoWatcherInited){

                        // Subscribe to topic
                        self.client.subscribe(self.mqttConfig.topic, function(e, g){
                            if (e){
                                self.status = "error";
                                self.client.disconnect();
                                console.log("ERROR "+ e);
                            } else {
                                self.status = "connected"; 
                            }
                        })

                    }
                    
                    geoWatcherInited = true;

                }, function(err){
                    console.log("ERROR "+ err.code +": "+ err.message);
                }, geolocationOpts);

            })
            .on('disconnect', function() {
                if (self.status != "error"){
                    self.status = "ready";
                }
                navigator.geolocation.clearWatch(self.geoWatcher);
                self.currentPos = undefined;
            })
            .on('connecting', function(){
                self.status = "connecting";
            })
            .on('message', function(topic, data, message){
                var payload = JSON.parse(data);
                var payloadDate = moment(payload.metadata.time);

                if(self.currentPos){

                    // If there were previously any errors, 
                    // set the status back to connected
                    self.status = "connected";
                    
                    // Append the sample to the samples collection
                    var sampleId = payload.dev_id + "_" + payloadDate.format('x');
                    var sampleRef = self.db.ref('samples/' + sampleId);
                    sampleRef.set({
                        dev_id: payload.dev_id,
                        app_id: payload.app_id,
                        freq: payload.metadata.frequency,
                        data_rate: payload.metadata.data_rate,
                        coding_rate: payload.metadata.coding_rate,
                        lat: self.currentPos.lat,
                        lng: self.currentPos.lng,
                        acc: self.currentPos.acc,                            
                        gateways: _.keyBy(_.map(payload.metadata.gateways, function(g){
                            var g2 = {
                                gtw_id: g.gtw_id,
                                rssi: g.rssi,
                                snr: g.snr,
                                channel: g.channel,
                                rf_chain: g.rf_chain,
                                timestamp: g.timestamp
                            }

                            if (g.hasOwnProperty('latitude') && g.hasOwnProperty('longitude')){
                                g2.lat = g.latitude;
                                g2.lng = g.longitude;
                            }

                            if (g.hasOwnProperty('altitude')){
                                g2.alt = g.altitude;
                            }

                            return g2;
                        }), function(g){
                            return g.gtw_id;
                        }),
                        timestamp: payloadDate.valueOf()
                    });

                    self.samplePoints.push(self.currentPos);

                } else {
                    self.status = "warning";
                }

            });
                            
            if (!navigator.geolocation) {
                self.status = "error";
                console.log("ERROR Browser does not support gelocation");
            }

            self.db = firebase.database();

        },
        mounted: function () {

            var self = this;

            if (self.map){
                self.initButton();
            }

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
        destroyed: function () {

            var self = this;
            self.destroyButton();

        }
    });

})(window, Vue, _);