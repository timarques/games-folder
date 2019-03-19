const {Gio, GLib, Soup} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;
const {Game} = Me.imports.game;
const {Icon} = Me.imports.icon;
const homeDirectory = GLib.get_home_dir();

class SteamApp extends Game
{
	constructor(data)
	{
		super({
			id: data.id,
			command: data.command,
			icon: 'steam',
			name: data.name,
			collection: 'Steam'
		});
		this.game = false;
	}
	
	static initWithFile(file, type, callback)
	{
	    if(
			GLib.file_test(file.get_path(), GLib.FileTest.IS_DIR) ||
			!file.get_basename().includes('appmanifest_')
		) throw new Error('Isn\'t a valid SteamApp');
		Utils.getFileContent(file, content => {
			// FIXME: Replace Split with Regex Rule
			// FIXME: Improve Regex Rule
			// FIXME: Better way to get more data in Steam files
			const app = new this({
				id: file.get_basename().match('appmanifest_(.*?).acf')[1],
				name: content.split('"name"')[1].split('"')[1]
			});
			app.command = type === 'flatpak' ?
				    'flatpak run steam steam://rungameid/' + app.id :
				    'steam steam://rungameid/' + app.id;
			callback(app);
		});
	}
	
	createShortcut(directory, callback)
	{
		this.loadData(()=>{
			if(!this.isGame()) callback(false);
			super.createShortcut(directory);
			callback(true);
		});
	}
	
	isGame()
	{
		return this.game;
	}
	
	loadData(callback)
	{
		// FIXME: Is this the better way to get game icons??
		Utils.requestPage({
			method: 'GET',
			uri: 'https://store.steampowered.com/app/' + this.id + '/',
			headers: {
				Cookie: 'birthtime=218246401'
			}
		}, (data, message) => {
			if(!data || !message.get_uri().get_path().includes(this.id)){
				log('GamesFolder: Can\'t reach steam store.');
			} else this._parseData(data);
			callback();
		});
	}
	
	_parseData(data)
	{
		// FIXME: Convert Splits to Regex Rules
		const iconUrl = data.split(
			'<div class="apphub_AppIcon"><img src="'
		)[1].split('"><div class="overlay">')[0];
		this.description = data.split(
			'<div class="game_description_snippet">'
		)[1].split('</div>')[0].trim();
		this.name = data.split(
			'<div class="apphub_AppName">'
		)[1].split('</div>')[0];
		const descriptionArea = data.split(
			'<div id="game_area_description" class="game_area_description">'
		)[1].split('</h2>')[0];
		this.game = descriptionArea.includes('Game');
		try{
		    Icon.initWithUri(iconUrl, icon => {
		        const iconsFolder = homeDirectory + '/.local/share/icons/hicolor/32x32/apps/';
		        const iconName = icon.file.get_basename().split('.')[0];
		        icon.convert();
		        icon.file.move(
		            Gio.File.new_for_path(iconsFolder + iconName),
		            Gio.FileCopyFlags.OVERWRITE,
		            null,
		            null
		        );
		        this.icon = iconName;
		    });
		}catch(error){
		    log('GamesFolder: '+error);
		}
	}
	
}

var Steam = class
{

	constructor()
	{
		const directories = {
			native: homeDirectory + '/.local/share/Steam',
			flatpak: homeDirectory + '/.var/app/com.valvesoftware.Steam/.local/share/Steam'
		};
		this.directory = null;
		this.type = null;
		for(const key in directories){
		    const directory = Gio.File.new_for_path(directories[key]);
		    if(directory.query_exists(null)){
		        this.directory = directory;
		        this.type = key;
		        log('GamesFolder: '+key);
		        break;
	        }
		};
	}

	isInstalled()
	{
		return this.directory ? true : false;
	}
	
	find(steamAppFile, callback)
	{
	    try{
		    SteamApp.initWithFile(steamAppFile, this.type, callback);
		}catch(error){
		    log('GamesFolder: '+error);
		    callback();
		}
	}

	findAll(callback)
	{
		Utils.listFiles(this.directory.get_child('steamapps'), file => {
			this.find(file, callback);
		});
	}

}
