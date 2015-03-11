var Remote = require('remote');
var dialog = Remote.require('dialog');
var Url = require('fire-url');
var Fs = require('fire-fs');
var projectPath = Remote.getGlobal('FIRE_PROJECT_PATH');
var Path = require('fire-path');

Polymer({
    publish: {
        sceneList: [],
        platform: [
            {name:"PC",value:"PC"},
            {name:"Mobile",value:"Mobile"},
        ],
        platformConfig: [
            {name:"Builder.js",value:"Builder.js"},
            {name:"Builder.Platform",value:"Builder.Platform"},
        ],
        defaultPlatformConfig: "Builder.Platform",
        defaultPlatform: "Mobile",
        isDebug: true,
        defaultScene: "",
        defaultBuildPath: "",
        projectName: "",
        buildSceneList: [], //scene list for buid
    },

    created: function () {
        this.ipc = new Fire.IpcListener();

        this.settingPath = Path.join( projectPath, 'settings' ) + "/build-settings.json";
        this.isInvalidName = false;
        this.isInvalidPath = false;
        var loadFile = false;

        this.loadConfig(function (data,err,errMsg) {
            if (!err) {
                this.isDebug = data.isDebug;
                this.defaultScene = data.defaultScene;
                this.defaultBuildPath = data.BuildPath;
                this.defaultPlatform = data.platform;
                this.defaultPlatformConfig = data.platformConfig;
                this.projectName = data.projectName;
                this.sceneList = data.sceneList;
                loadFile = true;
            }
            else {
                loadFile = false;
            }

        }.bind(this));

        if (!loadFile) {
            this.projectName = Path.basename(projectPath);
            this.defaultBuildPath = projectPath;
        }
    },

    attached: function () {
        Fire.sendToCore('asset-db:build-settings:getLibrarylist');
        this.ipc.on('asset-db:build-settings:SceneList', function ( results ) {
            this.sceneList = [];
            for ( var i = 0; i < results.length; ++i ) {
                var item = results[i];
                this.sceneList.push( { name: item.url, value: item.uuid, noignore: true, } );
            }
            this.defaultScene = this.sceneList[0].value;
        }.bind(this) );
    },

    chooseDistPath: function () {
        dialog.showOpenDialog({ defaultPath: projectPath, properties: ['openDirectory', 'multiSelections' ]},function (res) {
            if (res) {
                this.defaultBuildPath = res;
            }
        }.bind(this));
    },

    selectChanged: function (event) {
        for (var i = 0; i < this.sceneList.length; ++i) {
            if (this.sceneList[i].value === this.defaultScene) {
                this.sceneList[i].noignore = true;
            }
        }
    },

    getBuildList: function () {
        var buildList = [];
        for (var i = 0; i < this.sceneList.length; ++i) {
            if (this.sceneList[i].noignore === true) {
                buildList.push(this.sceneList[i].value);
            }
        }
        this.buildSceneList = buildList;
    },

    saveConfig: function () {
        var settings = {
            projectName: this.projectName,
            defaultScene: this.defaultScene,
            platform: this.defaultPlatform,
            platformConfig: this.defaultPlatformConfig,
            BuildPath: this.defaultBuildPath,
            isDebug: this.isDebug,
            buildSceneList: this.buildSceneList,
            sceneList: this.sceneList,
        };

        var settingsJson = JSON.stringify(settings, null, 2);
        Fs.writeFile(this.settingPath, settingsJson, 'utf8', function ( err ) {
            if ( err ) {
                Fire.error( err.message );
                return;
            }
            Fire.log('Start Building...');
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

    pathInputBlurAction: function () {
        if ( !Fs.existsSync(this.defaultBuildPath) || !Fs.statSync(this.defaultBuildPath).isDirectory() ) {
            Fire.warn('Build Dir Not Eixsts');
            this.$.path.setAttribute("invalid","");
            this.isInvalidPath = true;
            return;
        }
        this.$.path.removeAttribute("invalid");
        this.isInvalidPath = false;
        if (!this.isInvalidName && !this.isInvalidPath) {
            this.$.tip.style.display = "none";
        }
    },

    projectNameBlurAction: function () {
        if ( this.$.projName.value === "" ) {
            Fire.warn('Invalid Project Name');
            this.$.projName.setAttribute("invalid","");
            this.isInvalidName = true;
            return;
        }
        this.$.projName.removeAttribute("invalid");
        this.isInvalidName = false;
        if (!this.isInvalidName && !this.isInvalidPath) {
            this.$.tip.style.display = "none";
        }
    },

    buildAction: function () {
        if (!this.isInvalidName && !this.isInvalidPath) {
            this.$.tip.style.display = "none";
            this.getBuildList();
            this.saveConfig();

            // TODO build Action

        }else {
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

    cancelAction: function () {
        window.close();
    },
});
