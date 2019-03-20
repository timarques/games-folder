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
        this.monitors = [];
    }
    
    getGame(gameId)
    {
    	this.games.find(game => game.id === gameId);
    }

    addGame(game)
    {
        if(!game) return null;
        const currentGame = this.getGame(game.id);
        if(!currentGame){
        	log('GamesFolder: Adding new game ' + game.id);
        	game.loadData(()=>{
        	    game.createIcon(this.iconsDirectory, ()=> {
            	    game.createShortcut(this.applicationsDirectory);
        			this.games.push(game);
			        this.gamesSettings.addApp(
				        this.applicationsDirectory.get_basename() + '-' +
				        game.shortcut.get_basename()
			        );
			        //update-mime-database $HOME/.local/share/mime
			    });
        	});
        }else if(currentGame.isHidden()) currentGame.show();
    }
    
    removeGame(game)
    {
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
            const module = new Me.imports.modules[moduleName][className](this.iconsDirectory);
            // FIXME: "isInstalled" method name is weird.
            if(module.isInstalled()) this.modules.push(module);
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
                module.find(file, game => {
            		if(!game) return null;
            		if(eventType === 2 || eventType === 10) this.addGame(game);
                	else if(eventType === 3 || eventType === 9) this.removeGame(game);
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
    		if(!shortcutFile && index === array.length - 1) return loadGames();
			return Game.initWithShortcutFile(shortcutFile, game => {
				this.games.push(game);
				if(index === array.length - 1) loadGames();
			});
    	});
    }

}
