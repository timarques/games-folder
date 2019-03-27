const {Gio, GLib} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;
const {Game} = Me.imports.game;
const {DirectoryMonitor} = Me.imports.directory_monitor;

var Controller = class
{

    constructor(data)
    {
        this.modules = [];
        this.games = [];
        this.gamesSettings = data.gamesSettings;
        this.configurations = data.configurations;
        this.applicationsDirectory = data.applicationsDirectory;
        this.iconsDirectory = data.iconsDirectory;
        this.iconThemeDirectory = data.iconThemeDirectory;
        this.monitors = [];
    }

    getGame(gameId)
    {
    	return this.games.find(game => game.id === gameId);
    }

    addGame(game)
    {
        if(!game) return null;
        log('GamesFolder: Show game ' + game.id);
        const currentGame = this.getGame(game.id);
        if(!currentGame){
        	log('GamesFolder: Adding new game ' + game.id);
        	game.loadData(() => {
        	    game.createShortcut(this.applicationsDirectory);
        	    if(game.createIcon) game.createIcon(
        	        this.iconsDirectory, this.iconThemeDirectory
        	    );
    			this.games.push(game);
		        this.gamesSettings.addApp(
			        this.applicationsDirectory.get_basename() + '-' +
			        game.shortcut.get_basename()
		        );
        	});
        }else if(currentGame.isHidden()) currentGame.show();
    }
    
    removeGame(game)
    {
        log('GamesFolder: Hide game ' + game.id);
    	this.getGame(game.id).hide();
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
        		return module.constructor.name.toLowerCase()
        	});
        	callback();
    	});
    }

    addMonitors()
    {
        log('GamesFolder: Adding monitors to modules.');
        this.modules.forEach(module => {
            const monitor = new DirectoryMonitor(module.directory);
            monitor.connect((file, eventType) => {
                log('GamesFolder: files have been changed');
                module.find(file, game => {
            		if(!game) return null;
            		if(eventType === 2 || eventType === 10) this.removeGame(game);
                	else if(eventType === 3 || eventType === 9) this.addGame(game);
            	});
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
    		try{
			    return Game.initWithShortcutFile(shortcutFile, game => {
				    this.games.push(game);
				    if(index === array.length - 1) loadGames();
			    });
			}catch(error){
			    log('GamesFolder: ' + error);
			    this.gamesSettings.removeApp(app);
			}
			if(index === array.length - 1) loadGames();
    	});
    }

}
