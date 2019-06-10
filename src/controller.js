const {Gio, GLib} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;
const {Game} = Me.imports.game;
const {Monitor} = Me.imports.monitor;

var Controller = class
{

    constructor(data)
    {
        this.modules = [];
        this.games = [];
        this.gamesSettings = data.gamesSettings;
        this.configurations = data.configurations;
        this.applicationsDirectory = data.applicationsDirectory;
        this.iconsDirectories = data.iconsDirectories;
        this.iconThemeDirectory = data.iconThemeDirectory;
        this.monitors = [];
        this.refreshShortcutTimeout = null;
    }

    getGame(gameId)
    {
    	return this.games.find(game => game.id == gameId);
    }

    addGame(game)
    {
        if(!game) return null;
        log('GamesFolder: Adding game '+ game.id +' from '+ game.collection);
        const currentGame = this.getGame(game.id);
        if(!currentGame){
        	game.loadData(() => {
                if(this.getGame(game.id)) return null;
        	    log('GamesFolder: Loading data ' + game.name);
                log('GamesFolder: Creating icon ' + game.name);
        	    game.createIcon({
                    directories: this.iconsDirectories, 
                    themeDirectory: this.iconThemeDirectory, 
                    useThemeIcon: this.configurations.useThemeIcons
                }, () => {
        	        log('GamesFolder: Creating shortcut ' + game.name);
        	        game.createShortcut(this.applicationsDirectory);
        	        log('GamesFolder: Insert new game ' + game.name);
        	        this.games.push(game);
		            this.gamesSettings.addApp(
			            this.applicationsDirectory.get_basename() + '-' +
			            game.shortcut.get_basename()
                    );
                    this.refreshShortcuts();
        	    });
        	});
        }else if(currentGame.isHidden()) {
            log('GamesFolder: Showing game ' + currentGame.id);
            currentGame.show();
            this.refreshShortcuts();
        }
    }
    
    removeGame(game)
    {
        log('GamesFolder: Hide game ' + game.id);
        this.getGame(game.id).hide();
        this.refreshShortcuts();
    }

    injectModules(callback)
    {
    	log('GamesFolder: Inject Modules');
        Utils.listFiles(Me.dir.get_child('modules'), file => {
            const moduleName = file.get_basename().replace('.js', '');
            const modules = this.configurations.modules;
            if(
            	modules.length > 0 && 
            	!modules.includes(moduleName)
            ) return null;
            const className = Utils.upFirstLetter(moduleName);
            try{
                const module = new Me.imports.modules[moduleName][className]();
                this.modules.push(module);
            }catch(error){
                log('GamesFolder: ' + error);
            }
        }, ()=> {
        	this.configurations.modules = this.modules.map(module => {
        		return module.constructor.name.toLowerCase();
        	});
        	callback();
    	});
    }

    addMonitors()
    {
        log('GamesFolder: Adding monitors to modules.');
        this.modules.forEach(module => {
            const monitor = new Monitor(module.directory, 'directory');
            monitor.connect((file, eventType) => {
                let operation = null;
                log('GamesFolder: files have been changed');
                if(eventType === 2 || eventType === 10) operation = 'remove';
                else if(eventType=== 1 || eventType === 3) operation = 'add';
                else return null;
                (this)[operation + 'Game'](module.find(file));
            });
            this.monitors.push(monitor);
        });
    }

    removeMonitors()
    {
        this.monitors.forEach(monitor => monitor.cancel());
    }

    synchronize()
    {
    	log('GamesFolder: Synchronizing');
    	const loadGames = () => {
    	    log('GamesFolder: Loading games');
    	    log('GamesFolder: '+ this.games.length + ' games loaded');
    		this.modules.forEach(module => module.findAll(game => this.addGame(game)));
    	};
    	const apps = this.gamesSettings.apps;
    	if(apps.length === 0) return loadGames();
    	apps.forEach((app, index, array) => {
    		const shortcutPath = app.replace(/-/g, '/');
    		let shortcutFile = null;
    		this.configurations.directories.forEach(directory => {
    			const file = Gio.File.new_for_path(directory + '/' + shortcutPath);
    			if(file.query_exists(null)) shortcutFile = file;
            });
            if(!shortcutFile) return this.gamesSettings.removeApp(app);
            const shortcutName = shortcutFile.get_basename();
            const shortcutNameSplit = shortcutName.split('_');
    		if(
                !shortcutName.includes('gf') ||
                shortcutNameSplit.length !== 3 ||
                !this.configurations.modules.find(module => module === shortcutNameSplit[1])
            ) return this.gamesSettings.removeApp(app);
    		try{
			    Game.initWithShortcutFile(shortcutFile, game => {
				    this.games.push(game);
				    if(index === array.length - 1) loadGames();
			    });
			}catch(error){
			    log('GamesFolder: ' + error);
			    this.gamesSettings.removeApp(app);
			    if(index === array.length - 1) loadGames();
			}
    	});
    }

    refreshShortcuts()
    {
        if(this.refreshShortcutTimeout) GLib.Source.remove(this.refreshShortcutTimeout);
        this.refreshShortcutTimeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, ()=>{
            log('GamesFolder: Refreshing menu shortcuts');
            GLib.spawn_command_line_sync(
                'update-desktop-database -q '+ GLib.get_user_data_dir() +'/applications'
            );
            return false;
        });
    }

}
