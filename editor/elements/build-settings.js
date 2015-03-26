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
        'settings.projectName': 'projectNameChanged',
        'settings.defaultScene': 'defaultSceneChanged',
        'settings.platform': 'platformChanged',
        'settings.isDebug': 'isDebugChanged',
        'settings.buildPath': 'buildPathChanged',
    },

    isProjectNameValid: true,
    isBuildPathValid: true,
    hoverBuildButton: false,

    created: function () {
        var projectPath = Remote.getGlobal('FIRE_PROJECT_PATH');
        var projectName = Path.basename(projectPath);

        this.settings = {
            projectName: projectName,
            defaultScene: "",
            sceneList: [],
            isDebug: true,
            platform: "web-mobile",
            buildPath: Path.join(projectPath, "mobile-" + projectName),
        };
    },

    domReady: function () {
        Fire.sendToCore('build-settings:query-scenes');
    },

    ipcQuerySceneResults: function ( event ) {
        var results = event.detail.results;

        this.settings.sceneList = results.map( function ( item ) {
            return { name: item.url, value: item.uuid, checked: true };
        });

        if ( this.settings.sceneList.indexOf(this.settings.defaultScene) === -1 ) {
            this.settings.defaultScene = this.settings.sceneList[0].value;
        }
        this.settings.save();
    },

    defaultSceneChanged: function () {
        for (var i = 0; i < this.settings.sceneList.length; ++i) {
            if (this.settings.sceneList[i].value === this.settings.defaultScene) {
                this.settings.sceneList[i].checked = true;
            }
        }
        this.settings.save();
    },

    buildPathChanged: function () {
        this.settings.save();
        if (this.settings.buildPath) {
            this.isBuildPathValid = true;
            return;
        }
        this.isBuildPathValid = false;
    },

    projectNameChanged: function () {
        this.settings.save();
        if ( this.settings.projectName ) {
            this.isProjectNameValid = true;
            return;
        }

        this.isProjectNameValid = false;
    },

    platformChanged: function () {
        var projectPath = Remote.getGlobal('FIRE_PROJECT_PATH');
        if ( this.settings.platform === "web-mobile" ) {
            this.settings.buildPath = projectPath + "/mobile-" + this.settings.projectName;
        }
        else {
            this.settings.buildPath = projectPath + "/desktop-" + this.settings.projectName;
        }
        this.settings.save();
    },

    isDebugChanged: function () {
        this.settings.save();
    },

    chooseDistPath: function () {
        var dialog = Remote.require('dialog');
        var projectPath = Remote.getGlobal('FIRE_PROJECT_PATH');

        dialog.showOpenDialog({ defaultPath: projectPath, properties: ['openDirectory']},function (res) {
            if (res) {
                if (this.settings.platform === "web-mobile") {
                    this.settings.buildPath = res + "/mobile-" + Path.basename(projectPath);
                }
                else {
                    this.settings.buildPath = res + "/desktop-" + Path.basename(projectPath);
                }
            }
        }.bind(this));
    },

    buildAction: function () {
        if ( this.isProjectNameValid && this.isBuildPathValid ) {
            this.$.tip.style.display = "none";

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
        if (!Fs.existsSync(this.settings.buildPath)) {
            Fire.warn("'"+this.settings.buildPath + "' not exists!");
            return;
        }
        Shell.showItemInFolder(Path.normalize(this.settings.buildPath));
        Shell.beep();
    },

    closeAction: function () {
        window.close();
    },
});
