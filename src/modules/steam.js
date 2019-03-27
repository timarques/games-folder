const {Gio, GLib, Soup} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;
const {Game} = Me.imports.game;
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
		this.iconUri = null;
		this.file = data.file;
	}
	
	static initWithFile(file, type)
	{
	    if(
			GLib.file_test(file.get_path(), GLib.FileTest.IS_DIR) ||
			!file.get_basename().includes('appmanifest_')
		) throw new Error('Isn\'t a valid SteamApp');
		const id = file.get_basename().replace(/[^0-9]/g, '');
		return new this({
			id: id,
			file: file,
			command: (
			    type === 'flatpak' ?
			    'flatpak run com.valvesoftware.Steam steam://rungameid/' + id :
			    'steam steam://rungameid/' + id
			)
		});
	}

	createIcon(directory, themeDirectory)
	{
	    this._getIconTheme(themeDirectory, icon => {
	        if(icon) {
	            this.icon = icon;
	            return this.updateShortcut();
            }
            this._generateIcon(directory, icon => {
                if(icon) {
                    this.icon = icon;
                    this.updateShortcut();
                }
            });
	    })
	}

	loadData(callback)
	{
		Utils.requestPage({
			method: 'GET',
			uri: 'https://store.steampowered.com/app/' + this.id + '/',
			headers: {
				Cookie: 'birthtime=218246401'
			}
		}, (data, message) => {
			if(!data || !message.get_uri().get_path().includes(this.id)){
				return log('GamesFolder: Can\'t reach steam store.');
			}
		    this._parseData(data);
		    Utils.getFileContent(this.file, content => {
		        if(!this.game) return null;
		        if(content.split('"StateFlags"')[1].split('"')[1] === '4') callback();
		    });
		});
	}
	
	_parseData(data)
	{
		// FIXME: Convert Splits to Regex Rules
		this.iconUri = data.split(
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
	}
	
	_getIconTheme(directory, callback)
	{
	    const iconName = 'steam_icon_' + this.id;
	    let exists = false;
	    Utils.listFiles(directory.get_child('apps'), file => {
	        if(
	            exists ||
	            !GLib.file_test(file.get_path(), GLib.FileTest.IS_DIR) ||
	            (
	                !file.get_child(iconName + '.svg').query_exists(null) &&
	                !file.get_child(iconName + '.png').query_exists(null)
	            )
	        ) return null;
	        exists = true;
	    }, () => exists ? callback(iconName) : callback(null));
	}

	_generateIcon(directory, callback)
	{
	    if(!this.iconUri || !this.iconUri.includes('://')) return null;
        log('GamesFolder: Creating icon game');
        Utils.downloadFile(this.iconUri, file => {
            try{
                const iconName = 'gf_'+this.id;
                const icon = Utils.convertImage(file, 'png');
                icon.move(
                    directory.get_child(this.icon + '.png'),
                    Gio.FileCopyFlags.OVERWRITE,
                    null,
                    null
                );
                log('GamesFolder: Icon ' + this.icon + ' was created');
                callback(iconName);
            }catch(error){
                log('GamesFolder: '+error);
            }
        });
	}

}

var Steam = class
{

	constructor()
	{
		const directories = {
			native: homeDirectory + '/.steam/steam/steamapps',
			flatpak: homeDirectory + '/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps'
		};
		this.directory = null;
		this.type = null;
		for(const key in directories){
		    const directory = Gio.File.new_for_path(directories[key]);
		    if(directory.query_exists(null)){
		        this.directory = directory;
		        this.type = key;
		        break;
	        }
		}
		if(!this.directory) throw new Error('Steam isn\'t installed');
	}
	
	find(steamAppFile, callback)
	{
	    try{
		    callback(SteamApp.initWithFile(steamAppFile, this.type));
		}catch(error){
		    log('GamesFolder: '+error);
		}
	}

	findAll(callback)
	{
		Utils.listFiles(this.directory, file => {
			this.find(file, callback);
		});
	}

}
