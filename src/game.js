const {Gio} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;
const {Icon} = Me.imports.icon;

var Game = class
{

	constructor(data)
	{
		this.id = data.id;
		this.description = data.description || '';
		this.icon = data.icon;
		this.command = data.command;
		this.name = data.name || '';
		this.collection = data.collection || 'Standard';
		this.shortcut = data.shortcut;
		this.noDisplay = data.noDisplay || false;
	}
	
	static initWithShortcutFile(file, callback)
	{
		Utils.getFileContent(file, content => {
			const data = {
				id: file.get_basename().split('_')[1].replace('.desktop', ''),
				shortcut: file,
				noDisplay: true
			};
			const entries = content.split('\n');
			entries.forEach(entry => {
				const entrySplit = entry.split('=');
				switch(entrySplit[0]){
					case 'Comment':
						data.description = entrySplit[1];
						break;
					case 'Exec':
						data.command = entrySplit[1];
						break;
					case 'Icon':
					case 'Name':
						data[entrySplit[0].toLowerCase()] = entrySplit[1];
						break;
					case 'Categories':
						const categories = entrySplit[1].split(';');
						data.collection = categories[categories.length - 2];
						break;
				}
			});
			const game = new this(data);
			game.replaceShortcutContent();
			callback(game);
		});
	}
	
	createIcon(directory, callback)
	{
	    log('GamesFolder: Creating icon game');
	    if(!this.icon.includes('://')) return callback();
	    try{
            Icon.initWithUri(this.icon, icon => {
	            log('GamesFolder: Icon downloaded');
	            const iconName = this.collection.toLowerCase() +'_'+this.id;
	            icon.convert();
	            icon.file.move(
	                directory.get_child(iconName + '.' + icon.file.get_basename().split('.')[1]),
	                Gio.FileCopyFlags.OVERWRITE,
	                null,
	                null
	            );
	            log('GamesFolder: Icon converted to png');
	            this.icon = iconName;
	            callback();
	        });
	    }catch(error){
	        log('GamesFolder: '+error);
	        this.icon = this.collection.toLowerCase();
	        callback();
	    }
	}

	createShortcut(directory)
	{
		log('GamesFolder: Creating shortcut file for game ' + this.id);
		this.shortcut = directory.get_child(this.collection.toLowerCase() +'_'+this.id + '.desktop');
		if(!this.shortcut.query_exists(null))
        	this.shortcut.create(Gio.FileCreateFlags.NONE, null);
        this.replaceShortcutContent();
	}

	isHidden()
	{
		return this.noDisplay;
	}
	
	show()
	{
		this.noDisplay = false;
		this.replaceShortcutContent();
	}
	
	hide()
	{
		this.noDisplay = true;
		this.replaceShortcutContent();
	}
	
	removeShortcut()
	{
	    log('GamesFolder: Game '+ this.id +' remove shortcut');
		this.shortcut.delete(null);
	}
	
	replaceShortcutContent()
	{
		this.shortcut.replace_contents(
		    '\
[Desktop Entry]\n\
Type=Application\n\
Comment='+this.description+'\n\
Name='+this.name+'\n\
Icon='+this.icon+'\n\
Exec='+this.command+'\n\
Categories=Game;'+this.collection+';\n\
NoDisplay='+this.noDisplay.toString(),
            null,
            false,
            Gio.FileCreateFlags.NONE,
            null
        );
	}

}
