const {Gio, GLib} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;

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
				id: file.get_basename().replace('.desktop', ''),
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

	createShortcut(directory)
	{
		log('GamesFolder: Creating shortcut file for game ' + this.id);
		this.shortcut = directory.get_child(this.id + '.desktop');
		if(!this.shortcut.query_exists(null))
        	this.shortcut.create(Gio.FileCreateFlags.NONE, null);
        this.replaceShortcutContent();
	}
	
	removeShortcut()
	{
		if(this.shortcut) this.shortcut.delete(null);
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
