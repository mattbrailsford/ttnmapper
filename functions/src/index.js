const util = require('./ttnmapper.util');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const _ = require('lodash');

admin.initializeApp(functions.config().firebase);

exports.processGateways = functions.database.ref('samples/{sampleId}')
    .onWrite(evt => {

        const gatewaysRef = evt.data.adminRef.root.child('gateways');
        const sample = evt.data.val();

        var promises = [];

        // Process the gateways
        _.forOwn(sample.gateways, function(g, key) {
            let gatewayRef = gatewaysRef.child(g.gtw_id);
            promises.push(gatewayRef.transaction(function(current) {
                
                if (!current) {
                    current = {
                        gtw_id: g.gtw_id
                    };
                }

                if (g.hasOwnProperty('lat') && g.hasOwnProperty('lng')){
                    current.lat = g.lat;
                    current.lng = g.lng;
                } else {
                    delete current.lat;
                    delete current.lng;
                }

                if (g.hasOwnProperty('alt')){
                    current.alt = g.alt;
                } else {
                    delete current.alt;
                }

                return current;
            }));

        });

        return Promise.all(promises);

    });

exports.processTiles = functions.database.ref('samples/{sampleId}')
    .onWrite(evt => {

        const tilesRef = evt.data.adminRef.root.child('tiles');
        const sample = evt.data.val();

        // If the accuracy of the GPS reading is greater than 100m
        // then we'll just discount it as we can't really trust it
        if (sample.acc > 100){
            console.log('Skipping processing tile for sample '+ evt.data.key +' as accuracy was greater than 100m')
            return false;
        }

        // Get the best samples from the list of gateways
        var gateways = _.values(sample.gateways);
        var bestSnrGateway = _.maxBy(gateways, 'snr');
        var bestRssiGateway = _.maxBy(gateways, 'rssi');

        // Calculate the tile coords
        var tileCoords = util.fromLatLngToTile({
            lat: sample.lat,
            lng: sample.lng
        });

        // Store / update the tile
        var tileKey = "x_" + tileCoords.x + "_y_" + tileCoords.y;
        var tileRef = tilesRef.child(tileKey);
        return tileRef.transaction(function(current) {

            if (!current) {
                current = {
                    x: tileCoords.x,
                    y: tileCoords.y,
                    avg_snr: bestSnrGateway.snr,
                    avg_rssi: bestRssiGateway.rssi,
                    gateways: {},
                    sample_count: 1,
                    timestamp: sample.timestamp
                };
            } else {
                // EMA = (sample * alpha) + (Prev EMA * (1 - alpha))
                var alpha = 0.2;
                current.avg_snr = ((bestSnrGateway.snr * alpha) + (current.avg_snr * (1 - alpha)));
                current.avg_rssi = ((bestRssiGateway.rssi * alpha) + (current.avg_rssi * (1 - alpha)));
                current.sample_count = current.sample_count + 1;
            }

            // Add gateway id's to gateways collection
            _.forEach(gateways, function(g){
                if (!current.gateways.hasOwnProperty(g.gtw_id)){
                    current.gateways[g.gtw_id] = true;
                }
            })

            return current;
        });

    });