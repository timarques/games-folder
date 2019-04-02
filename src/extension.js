const {GLib, Gio} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;
const {Controller} = Me.imports.controller;
const {Games, Folders, Configurations, Interface} = Me.imports.settings;

var GamesFolder = class
{

    constructor()
    {
    	log('GamesFolder Initied');
        this.gamesSettings = new Games();
        this.foldersSettings = new Folders();
        this.configurations = new Configurations();
        this.interface = new Interface();
        this.controller = null;
        this.applicationsDirectory = null;
        this.configurationsConnection = null;
        this.folderName = 'Games';
    }

    enable()
    {
    	log('GamesFolder Enabled');
    	const name = this.configurations.name;
    	const dataDirectory = GLib.get_user_data_dir();
        this.folderName = name !== '' ? name : this.folderName;
        this.configurations.useThemeIcons = this.configurations.useThemeIcons;
    	this.configurations.name = this.folderName;
    	if(this.configurations.directories.length === 0){
    		this.configurations.directories = [
    			'/usr/share/applications',
    			dataDirectory + '/applications'
    		];
    	}
    	const iconsDirectories = [16, 24, 32, 48, 64, 128].map(size => {
    	    const directory = Gio.File.new_for_path(
        	    dataDirectory + '/icons/hicolor/' + size + 'x'+ size +'/apps'
        	);
        	if(!directory.query_exists(null)) directory.make_directory_with_parents(null);
        	return directory;
    	});
    	this.foldersSettings.add(this.folderName);
    	this.gamesSettings.name = this.folderName;
    	this.gamesSettings.translate = this.gamesSettings.translate || true;
    	this.applicationsDirectory = Gio.File.new_for_path(
    		dataDirectory + '/applications/' + this.folderName.toLowerCase()
    	);
        if(!this.applicationsDirectory.query_exists(null))
            this.applicationsDirectory.make_directory(null);
        const iconTheme = this.interface.iconTheme;
        const homeIconThemeDirectory = Gio.File.new_for_path(
            GLib.get_home_dir() + '/.icons/' + iconTheme
        );
        const globalIconThemeDirectory = Gio.File.new_for_path(
            '/usr/share/icons/' + iconTheme
        );
        const iconThemeDirectory = homeIconThemeDirectory.query_exists(null) ?
            homeIconThemeDirectory : globalIconThemeDirectory;
        this.controller = new Controller({
        	applicationsDirectory: this.applicationsDirectory,
        	iconsDirectories: iconsDirectories,
        	gamesSettings: this.gamesSettings,
        	configurations: this.configurations,
        	iconThemeDirectory: iconThemeDirectory
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
