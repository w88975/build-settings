var Url = require('fire-url');

module.exports = {
    load: function (context) {
        context.on('build-setting:open', function () {
            context.openWindow('build-setting');
        });

        context.on('asset-db:build-settings:getLibrarylist', function () {
            var results = [];
            for ( var p in Fire.AssetDB._pathToUuid ) {
                var url = Fire.AssetDB._url(p);
                if (Url.extname(url) === ".fire") {
                    results.push({ url: url, uuid: Fire.AssetDB._pathToUuid[p] });
                }
            }
            Fire.sendToPlugin( 'asset-db:build-settings:SceneList', results );
        });
    },
    unload: function (context) {
    },
};
