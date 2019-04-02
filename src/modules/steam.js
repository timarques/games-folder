const {Gio, GLib, Soup} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;
const {Game} = Me.imports.game;
const {Monitor} = Me.imports.monitor;

class SteamApp extends Game
{
	constructor(file, type)
	{
	    if(
		    GLib.file_test(file.get_path(), GLib.FileTest.IS_DIR) ||
		    !file.get_basename().includes('appmanifest_')
	    ) throw new Error('Isn\'t a valid SteamApp');
	    const id = file.get_basename().replace(/[^0-9]/g, '');
        super({
            id: id,
		    icon: 'steam_icon_' + id,
		    collection: 'steam',
		    command: (
		        type === 'flatpak' ?
		        'flatpak run com.valvesoftware.Steam steam://rungameid/' + id :
		        'steam steam://rungameid/' + id
		    )
		});
		this.game = false;
		this.iconUri = null;
		this.file = file;
	}

	createIcon(data, callback)
	{
	    super.createIcon(data, icon => {
            if(
				data.useThemeIcon ||
				icon || 
				!this.iconUri || 
				!this.iconUri.includes('://')
			) return callback();
            Utils.downloadFile(this.iconUri, file => {
                try{
                    const iconName = 'gf_' + this.collection + '_' + this.id;
                    const icon = Utils.convertImage(file, 'png');
                    icon.move(
                        data.directories[2].get_child(iconName + '.png'),
                        Gio.FileCopyFlags.OVERWRITE,
                        null,
                        null
                    );
                    this.icon = iconName;
                }catch(error){
                    log('GamesFolder: '+error);
                }
                callback();
            });
	    });
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
				return log('GamesFolder: '+ this.id +' can\'t reach steam store.');
			}
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
		    if(!this.game) return null;
		    Utils.getFileContent(this.file, content => {
				if(content.split('"StateFlags"')[1].split('"')[1] === '4') callback();
		    });
		});
	}

}

var Steam = class
{

	constructor()
	{
	    const homeDirectory = GLib.get_home_dir();
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
	
	find(steamAppFile)
	{
		try{
			return new SteamApp(steamAppFile, this.type);
		}catch(error){
			log('GamesFolder: ' + steamAppFile.get_basename() + ' isn\'t a valid SteamApp');
		}
	}

	findAll(callback)
	{
		Utils.listFiles(this.directory, file => callback(this.find(file)));
	}

}
