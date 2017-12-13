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

})(window, );