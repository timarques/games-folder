const {Gio} = imports.gi;
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
		this.hide = data.hide || false;
		if(!this.id) throw new Error('Contructor needs id parameter.');
	}

	static initWithShortcutFile(file, callback)
	{
	    const fileName = file.get_basename();
	    if(!fileName.includes('gf_') || !fileName.includes('.desktop')) throw new Error(
	        'GamesFolder: '+file.get_path()+' isn\'t a valid file'
	    );
		Utils.getFileContent(file, content => {
			const data = {
				id: file.get_basename().split('_')[1].replace('.desktop', ''),
				shortcut: file,
				hide: true
			};
			content.split('\n').forEach(entry => {
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
			callback(new this(data));
		});
	}

	isHidden()
	{
		return this.hide;
	}

	show()
	{
		this.hide = false;
		this.updateShortcut();
	}

	hide()
	{
		this.hide = true;
		this.updateShortcut();
	}

	createShortcut(directory)
	{
		log('GamesFolder: Creating shortcut file for game ' + this.id);
		this.shortcut = directory.get_child('gf_'+this.id + '.desktop');
		if(!this.shortcut.query_exists(null))
        	this.shortcut.create(Gio.FileCreateFlags.NONE, null);
        this.updateShortcut();
	}

	removeShortcut()
	{
	    log('GamesFolder: Game '+ this.id +' remove shortcut');
		this.shortcut.delete(null);
	}

	updateShortcut()
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
NoDisplay='+this.hide.toString(),
            null,
            false,
            Gio.FileCreateFlags.NONE,
            null
        );
	}

}
