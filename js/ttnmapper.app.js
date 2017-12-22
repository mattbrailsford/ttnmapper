(function(global, Vue, _, undefined){

    // ========================================================
    // Variables
    // ========================================================
    var vm;
    var options = { }

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
                    var t = data.val();
                    t.$key = data.key;
                    t.type = 'tile';
                    self.tiles.push(t);
                });
                tilesRef.on('child_changed', function(data){
                    var t = data.val();
                    t.$key = data.key;
                    t.type = 'tile';
                    var idx = _.findIndex(self.tiles, { $key: data.key });
                    if (idx >= 0){
                        self.tiles.splice(idx, 1, t);
                    }
                });
                tilesRef.on('child_removed', function(data){
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