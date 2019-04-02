const {GLib, Gio} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;
const {Game} = Me.imports.game;

class LutrisGame extends Game
{

    constructor(configFile, connection)
    {
        const configFileNameSplit = configFile.get_basename().split('-');
        configFileNameSplit.pop();
        const installerSlug = configFileNameSplit.join('-');
        const results = connection.execute_select_command(
            `SELECT id, name, slug FROM games WHERE installer_slug = "${installerSlug}";`
        );
        if(results.get_n_rows() === 0) throw new Error(installerSlug + ' isn\'t a valid game');
        const id = results.get_value_at(0, 0);
        const slug = results.get_value_at(2, 0);
        super({
            id: id,
            command: 'lutris lutris:rungameid/' + id,
            icon: 'lutris_' + slug,
            collection: 'lutris',
            name: results.get_value_at(1, 0)
        });
        this.iconUri = null;
        this.slug = slug;
    }

    loadData(callback)
    {
        Utils.requestPage({
            method: 'GET',
            uri: 'https://lutris.net/api/games/' + this.slug
        }, data => {
            data = JSON.parse(data);
            this.iconUri = 'https://lutris.net' + data.icon_url;
            callback();
        });
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
                const iconName = 'gf_' + this.collection + '_' + this.id;
                file.move(
                    data.directories[5].get_child(iconName + '.png'),
                    Gio.FileCopyFlags.OVERWRITE,
                    null,
                    null
                );
                this.icon = iconName;
                callback();
            });
	    });
	}

}

var Lutris = class
{

    constructor()
    {
        this.directory = Gio.File.new_for_path(
            GLib.get_user_config_dir() + '/lutris/games'
        );
        if(!this.directory.query_exists(null)) throw new Error('Lutris isn\'t installed');
        let Gda = null;
        try{
            Gda = imports.gi.Gda; 
        }catch(error){
            throw new Error('Missing Gda lib');
        }
        this.connection = new Gda.Connection ({
            provider: Gda.Config.get_provider('SQLite'),
            cnc_string: `DB_DIR=${GLib.get_user_data_dir()}/lutris;DB_NAME=pga.db`
        });
        this.connection.open();
    }

    find(gameConfig)
    {
        try{
            return new LutrisGame(gameConfig, this.connection);
        }catch(error){
            log('GamesFolder: ' + error);
        }
    }

    findAll(callback)
    {
        Utils.listFiles(this.directory, file => callback(this.find(file)));
    }

}
