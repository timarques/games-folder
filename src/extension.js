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
        	gamesSettings: this.gamesSettings,
        	configurations: this.configurations
        });
        this.controller.injectModules(() => {
            this.controller.addMonitors();
            this.controller.synchronize();
            this.configurations.connect("changed", (settings, key) => {
                log('GamesFolder: Configurations has changed.'+key);
                this.disable();
                this.enable();
            });
        });
    }

    disable()
    {
        log('GamesFolder Disabled');
        this.controller.games.forEach(game => games.desactive());
        this.controller.removeMonitors();
        this.gamesSettings.reset('apps');
        this.foldersSettings.remove(this.folderName);
    }

}

var init = () => new GamesFolder();
