(function(global){
    
    global.ttnmapper = global.ttnmapper || {};
    global.ttnmapper.config = global.ttnmapper.config || {
        deviceId: '',
        mqtt: {
            host: "",
            port: 34773,
            username: "",
            password: "",
            ssl: true,
            topic: "+/devices/+/up"
        },
        firebase: {

        }
    }

})(window);