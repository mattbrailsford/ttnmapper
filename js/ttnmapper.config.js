(function(global){

    global.ttnmapper = global.ttnmapper || {};
    global.ttnmapper.config = global.ttnmapper.config || {
        deviceId: 'mb_lora32u4_001',
        mqtt: {
            host: "m23.cloudmqtt.com",
            port: 34773,
            username: "pphmemwg",
            password: "Athpp5O1Lrm1",
            ssl: true,
            topic: "+/devices/+/up"
        },
        firebase: {
            apiKey: "AIzaSyC9POYvvK16iXTmuWYEipaRpGx2m680pAc",
            authDomain: "ttnmapper.firebaseapp.com",
            databaseURL: "https://ttnmapper.firebaseio.com",
            projectId: "ttnmapper",
            storageBucket: "ttnmapper.appspot.com",
            messagingSenderId: "1057112021730"
        }
    }

})(window);