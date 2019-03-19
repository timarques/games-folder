const {GLib, Gio} = imports.gi;

var Icon = class
{

	static create(uri, folder, name, overwrite = false)
	{
		const externalFile = Gio.File.new_for_uri(uri);
		const [tmpFile] = Gio.File.new_tmp(null);
		try{
			externalFile.move(tmpFile, Gio.FileCopyFlags.OVERWRITE, null, null);
		}catch(error){
			if(error.toString().includes('Not Found')) return null;
		}
		const file = Gio.File.new_for_path(
			folder + name + '.png'
		);
		if(file.query_exists(null) && overwrite === false)
			throw new Error('Icon already exists');
		if(externalFile.get_basename().includes('.png'))
			return externalFile.move(file, Gio.FileCopyFlags.OVERWRITE, null, null);
		try{
			GLib.spawn_command_line_async(
				'convert ' + tmpFile.get_path() + ' ' + file.get_path()
			);
		}catch(error){
			throw new Error('Can\'t run Convert command.Check if you have ImageMagic package installed');
		}
		return file;
	}

};
