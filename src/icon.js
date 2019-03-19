const {GLib, Gio} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;

var Icon = class
{

    constructor(file)
    {
        this.file = file;
    }

    static initWithUri(uri, callback)
    {
        Utils.downloadFile(uri, file => callback(new this(file)));
    }

    convert()
    {
        const path = this.file.get_path();
        const newPath = path.split('.')[0] + '.png';
		GLib.spawn_command_line_sync(
			'convert ' + path + ' ' + newPath
		);
		this.file.delete(null);
		this.file = Gio.File.new_for_path(newPath);
    }

};
