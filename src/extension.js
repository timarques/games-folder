const {GLib, Gio} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;
const {Controller} = Me.imports.controller;
const {Games, Folders, Configurations} = Me.imports.settings;

var GamesFolder = class
{

    constructor()
    {
    	log('GamesFolder Initied');
        this.gamesSettings = new Games();
        this.foldersSettings = new Folders();
        this.configurations = new Configurations();
        this.controller = null;
        this.applicationsDirectory = null;
        this.configurationsConnection = null;
        this.folderName = 'Games';
    }

    enable()
    {
    	log('GamesFolder Enabled');
    	const name = this.configurations.name;
    	const homeDirectory = GLib.get_home_dir();
    	this.folderName = name !== '' ? name : this.folderName;
    	this.configurations.name = this.folderName;
    	if(this.configurations.directories.length === 0){
    		this.configurations.directories = [
    			'/usr/share/applications',
    			homeDirectory + '/.local/share/applications'
    		];
    	}
    	const iconsDirectory = Gio.File.new_for_path(
    	    homeDirectory + '/.local/share/icons/hicolor/32x32/apps/'
    	);
    	if(!iconsDirectory.query_exists(null))
    	    iconsDirectory.make_directory_with_parents(null);
    	this.foldersSettings.add(this.folderName);
    	this.gamesSettings.name = this.folderName;
    	this.gamesSettings.translate = this.gamesSettings.translate || true;
    	this.applicationsDirectory = Gio.File.new_for_path(
    		homeDirectory + '/.local/share/applications/' + this.folderName.toLowerCase()
    	);
        if(!this.applicationsDirectory.query_exists(null))
            this.applicationsDirectory.make_directory(null);
        this.controller = new Controller({
        	applicationsDirectory: this.applicationsDirectory,
        	iconsDirectory: iconsDirectory,
        	gamesSettings: this.gamesSettings,
        	configurations: this.configurations
        });
        this.controller.injectModules(() => {
            this.controller.addMonitors();
            this.controller.synchronize();
            this.configurationsConnection = this.configurations.connect(
                "changed",
                (settings, key) => {
                    log('GamesFolder: Configurations has changed '+key);
                    this.disable(() => this.enable());
                }
            );
        });
    }

    disable(callback = null)
    {
        log('GamesFolder Disabled');
        this.controller.removeMonitors();
        this.gamesSettings.reset('apps');
        this.foldersSettings.remove(this.folderName);
        if(this.configurationsConnection)
            this.configurations.disconnect(this.configurationsConnection);
        Utils.emptyFolder(this.applicationsDirectory, true, callback);
    }

}

var init = () => new GamesFolder();
