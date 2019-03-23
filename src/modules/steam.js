const {Gio, GLib, Soup} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;
const {Game} = Me.imports.game;
const homeDirectory = GLib.get_home_dir();

var VDF = {
    parse: (text) => {
        const lines = text.split("\n");
        const object = {};
        const stack = [object];
        let expect_bracket = false;
        let name = "";

        const regexRule = new RegExp(
            '^("((?:\\\\.|[^\\\\"])+)"|([a-z0-9\\-\\_]+))' +
            '([ \t]*(' +
            '"((?:\\\\.|[^\\\\"])*)(")?' +
            '|([a-z0-9\\-\\_]+)' +
            '))?'
        );

        lines.forEach((line, index) => {
            line = line.trim();
            if( line == "" || line[0] == '/') return null;
            if( line[0] === "{" ) return expect_bracket = false;
            if(expect_bracket)
                throw new SyntaxError("VDF.parse: invalid syntax on line " + (index+1));
            if( line[0] == "}" ) return stack.pop();
            const match = regexRule.exec(line);
            if(!match)
                throw new SyntaxError("VDF.parse: invalid syntax on line " + (i+1));
            const key = (match[2] !== undefined) ? match[2] : match[3];
            const value = (match[6] !== undefined) ? match[6] : match[8];
            if(value){
                if(!match[7] && !match[8]) return line += "\n" + lines[++index];
                return stack[stack.length-1][key] = value;
            }
            if(!stack[stack.length-1][key]) stack[stack.length-1][key] = {};
            stack.push(stack[stack.length-1][key]);
            expect_bracket = true;
        });

        if(stack.length !== 1) throw new SyntaxError("VDF.parse: open parentheses somewhere");

        return object;
    },

    stringify: (object) => {
        const dump = (object, level = 0) => {
            const indent = "\t";
            let lineIndent = "";
            let string = "";

            Array(level).fill(1).forEach(() => lineIndent += indent);

            Object.keys(object).forEach(key => {
                if(typeof object[key] !== "object")
                    return string += `${lineIndent}"${key}" "${String(object[key])}"\n`;
                const node = this._dump(object[key], level+1);
                string += `${lineIndent}"${key}"${lineIndent}{\n${node}${lineIndent}}\n`;
            });
            return string;
        }
        return dump(object);
    }
}

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
	}
	
	static initWithFile(file, type, callback)
	{
	    if(
			GLib.file_test(file.get_path(), GLib.FileTest.IS_DIR) ||
			!file.get_basename().includes('appmanifest_')
		) throw new Error('Isn\'t a valid SteamApp');
		Utils.getFileContent(file, content => {
			const appState = VDF.parse(content).AppState;
			const app = new this({
				id: appState.appid,
				name: appState.name,
				command: (
				    type === 'flatpak' ?
				    'flatpak run com.valvesoftware.Steam steam://rungameid/' + appState.id :
				    'steam steam://rungameid/' + appState.id
				)
			});
			callback(app);
		});
	}
	
	isGame()
	{
		return this.game;
	}

	createIcon(directory)
	{
	    if(!this.iconUri || !this.iconUri.includes('://')) return null;
	    log('GamesFolder: Creating icon game');
	    Utils.downloadFile(this.iconUri, file => {
            try{
                this.icon = 'gf_'+this.id;
                const icon = Utils.convertImage(file, 'png');
                icon.move(
                    directory.get_child(this.icon + '.png'),
                    Gio.FileCopyFlags.OVERWRITE,
                    null,
                    null
                );
                log('GamesFolder: Icon ' + this.icon + ' was created');
                this.updateShortcut();
            }catch(error){
                log('GamesFolder: '+error);
            }
	    });
	}

	loadData(callback)
	{
		// FIXME: Is this the better way to get game icon??
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
		}
		if(!this.directory) throw new Error('Steam isn\'t installed');
	}
	
	find(steamAppFile, callback)
	{
	    try{
		    SteamApp.initWithFile(steamAppFile, this.type, callback);
		}catch(error){
		    log('GamesFolder: '+error);
		}
	}

	findAll(callback)
	{
		Utils.listFiles(this.directory.get_child('steamapps'), file => {
			this.find(file, callback);
		});
	}

}
