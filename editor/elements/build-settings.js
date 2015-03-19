var Remote = require('remote');
var Url = require('fire-url');
var Fs = require('fire-fs');
var Path = require('fire-path');
var Shell = Remote.require('shell');

Polymer({
    platformList: [
        { name: "Web Mobile", value: "web-mobile" },
        { name: "Web Desktop", value: "web-desktop" },
    ],

    observe: {
        'settings.defaultScene': 'defaultSceneChanged',
        'settings.buildPath': 'buildPathChanged',
        'settings.projectName': 'projectNameChanged',
        'settings.platform': 'platformChanged',
    },

    isProjectNameValid: true,
    isBuildPathValid: true,
    hoverBuildButton: false,

    created: function () {
        this.settings = {
            projectName: "",
            defaultScene: "",
            sceneList: [],
            isDebug: true,
            platform: "web-mobile",
            buildPath: "",
        };

        var projectPath = Remote.getGlobal('FIRE_PROJECT_PATH');
        this.settingPath = Path.join( projectPath, 'settings' ) + "/build-settings.json";

        this.settings.projectName = Path.basename(projectPath);
        if ( this.settings.platform === "web-mobile" ) {
            this.settings.buildPath = projectPath + "/mobile-" + this.settings.projectName;
        }
        else {
            this.settings.buildPath = projectPath + "/desktop-" + this.settings.projectName;
        }

        this.loadConfig(function ( err, data ) {
            if (!err) {
                this.settings.isDebug = data.isDebug;
                this.settings.defaultScene = data.defaultScene;
                this.settings.buildPath = data.buildPath;
                this.settings.platform = data.platform;
                this.settings.projectName = data.projectName;
            }

            Fire.sendToCore('build-settings:query-scenes');
        }.bind(this));
    },

    ipcQuerySceneResults: function ( event ) {
        var results = event.detail.results;

        this.settings.sceneList = results.map( function ( item ) {
            return { name: item.url, value: item.uuid, checked: true };
        });

        if ( this.settings.sceneList.indexOf(this.settings.defaultScene) === -1 ) {
            this.settings.defaultScene = this.settings.sceneList[0].value;
        }
    },

    defaultSceneChanged: function () {
        for (var i = 0; i < this.settings.sceneList.length; ++i) {
            if (this.settings.sceneList[i].value === this.settings.defaultScene) {
                this.settings.sceneList[i].checked = true;
            }
        }
    },

    buildPathChanged: function () {
        if (this.settings.buildPath) {
            this.isBuildPathValid = true;
            return;
        }
        this.isBuildPathValid = false;
    },

    projectNameChanged: function () {
        if ( this.settings.projectName ) {
            this.isProjectNameValid = true;
            return;
        }

        this.isProjectNameValid = false;
    },

    platformChanged: function () {
        var projectPath = Remote.getGlobal('FIRE_PROJECT_PATH');
        if (this.settings.platform === "web-mobile") {
            this.settings.buildPath = projectPath + "/mobile-" + this.settings.projectName;
        }else {
            this.settings.buildPath = projectPath + "/desktop-" + this.settings.projectName;
        }
    },

    chooseDistPath: function () {
        var dialog = Remote.require('dialog');
        var projectPath = Remote.getGlobal('FIRE_PROJECT_PATH');

        dialog.showOpenDialog({ defaultPath: projectPath, properties: ['openDirectory']},function (res) {
            if (res) {
                if (this.settings.platform === "web-mobile") {
                    this.settings.buildPath = res + "/mobile-" + Path.basename(projectPath);
                }else {
                    this.settings.buildPath = res + "/desktop-" + Path.basename(projectPath);
                }

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
                callback(e);
                return;
            }

            callback(null,data);
        });
    },

    buildAction: function () {
        if ( this.isProjectNameValid && this.isBuildPathValid ) {
            this.$.tip.style.display = "none";
            this.saveConfig();

            var buildUuidList = this.settings.sceneList.filter( function (item) {
                return item.checked;
            }).map(function (item) {
                return item.value;
            });

            // move default scene to first
            var firstSceneIndex = buildUuidList.indexOf(this.settings.defaultScene);
            var toSwap = buildUuidList[0];
            buildUuidList[0] = buildUuidList[firstSceneIndex];
            buildUuidList[firstSceneIndex] = toSwap;

            Fire.sendToCore('build-project', this.settings.platform, this.settings.buildPath, buildUuidList, this.settings);
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

    previewAction: function () {
        Shell.openExternal('http://localhost:7456');
        Shell.beep();
    },

    showInFinder: function () {
        Shell.showItemInFolder(this.settings.buildPath);
        Shell.beep();
    },

    closeAction: function () {
        window.close();
    },
});
