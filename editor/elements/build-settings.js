var Remote = require('remote');
var Url = require('fire-url');
var Fs = require('fire-fs');
var Path = require('fire-path');

Polymer({
    platformList: [
        {name:"PC",value:"PC"},
        {name:"Mobile",value:"Mobile"},
    ],

    platformConfigList: [
        {name:"Builder.js",value:"Builder.js"},
        {name:"Builder.Platform",value:"Builder.Platform"},
    ],

    observe: {
        'settings.defaultScene': 'defaultSceneChanged',
        'settings.buildPath': 'buildPathChanged',
        'settings.projectName': 'projectNameChanged',
    },

    isProjectNameValid: true,
    isBuildPathValid: true,
    hoverBuildButton: false,

    created: function () {
        this.ipc = new Fire.IpcListener();

        this.settings = {
            projectName: "",
            defaultScene: "",
            sceneList: [],
            isDebug: true,
            platform: "Mobile",
            platformConfig: "Builder.Platform",
            buildPath: "",
        };

        var projectPath = Remote.getGlobal('FIRE_PROJECT_PATH');
        this.settingPath = Path.join( projectPath, 'settings' ) + "/build-settings.json";

        var loadFile = false;
        this.loadConfig(function (data,err,errMsg) {
            if (!err) {
                this.settings.isDebug = data.isDebug;
                this.settings.defaultScene = data.defaultScene;
                this.settings.buildPath = data.buildPath;
                this.settings.platform = data.platform;
                this.settings.platformConfig = data.platformConfig;
                this.settings.projectName = data.projectName;
                this.settings.sceneList = data.sceneList;
                loadFile = true;
            }
            else {
                loadFile = false;
            }

        }.bind(this));

        if ( !loadFile ) {
            this.settings.projectName = Path.basename(projectPath);
            this.settings.buildPath = projectPath;
        }
    },

    attached: function () {
        Fire.sendToCore('build-settings:query-scenes');
        this.ipc.on('build-settings:query-scenes-results', function ( results ) {
            this.settings.sceneList = [];
            for ( var i = 0; i < results.length; ++i ) {
                var item = results[i];
                this.settings.sceneList.push( { name: item.url, value: item.uuid, ignore: false, } );
            }
            this.settings.defaultScene = this.settings.sceneList[0].value;
        }.bind(this) );
    },

    detached: function () {
        this.ipc.clear();
    },

    defaultSceneChanged: function () {
        for (var i = 0; i < this.settings.sceneList.length; ++i) {
            if (this.settings.sceneList[i].value === this.settings.defaultScene) {
                this.settings.sceneList[i].ignore = false;
            }
        }
    },

    buildPathChanged: function () {
        this.isBuildPathValid = Fs.isDirSync(this.settings.buildPath);
    },

    projectNameChanged: function () {
        if ( this.settings.projectName ) {
            this.isProjectNameValid = true;
            return;
        }

        this.isProjectNameValid = false;
    },

    chooseDistPath: function () {
        var dialog = Remote.require('dialog');
        var projectPath = Remote.getGlobal('FIRE_PROJECT_PATH');

        dialog.showOpenDialog({ defaultPath: projectPath, properties: ['openDirectory', 'multiSelections' ]},function (res) {
            if (res) {
                this.settings.buildPath = res;
            }
        }.bind(this));
    },

    saveConfig: function () {
        var settingsJson = JSON.stringify(this.settings, null, 2);
        Fs.writeFile(this.settingPath, settingsJson, 'utf8', function ( err ) {
            if ( err ) {
                Fire.error( err.message );
                return;
            }
        }.bind(this));
    },

    loadConfig: function (callback) {
        var exists = Fs.existsSync(this.settingPath);
        if (!exists)
            return;
        Fs.readFile(this.settingPath, 'utf8', function ( err, data ) {
            try {
                data = JSON.parse(data);
            }
            catch (e) {
                Fire.error(e);
                callback(data,true,e);
                return;
            }

            callback(data,false);
        });
    },

    buildAction: function () {
        if ( this.isProjectNameValid && this.isBuildPathValid ) {
            this.$.tip.style.display = "none";
            this.saveConfig();

            // TODO build Action
            var buildList = this.settings.sceneList.filter( function (item) {
                return !item.ignore;
            } );
            // TODO: @Jare, We've provide two parameter to help you: this.settings, buildList
            // TODO: @Jare the buildList can be calculate by yourself, so may be you can remove it afterward.
            Fire.warn('@Jare please fill building code here...');
        }
        else {
            this.$.tip.style.display = "block";
            this.$.tip.animate([
                { color: "white" },
                { color: "red" },
                { color: "white" },
                { color: "red" },
            ], {
                duration: 300
            });
        }
    },

    buildButtonHoverInAction: function (event) {
        this.hoverBuildButton = true;
    },

    buildButtonHoverOutAction: function () {
        this.hoverBuildButton = false;
    },

    closeAction: function () {
        window.close();
    },
});
