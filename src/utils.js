const {Gio, GLib, Soup} = imports.gi;
const ByteArray = imports.byteArray;
const Lang = imports.lang;

var Utils = class
{

	static slugify(text)
	{
		return text.toString().toLowerCase()
			.replace(/\s+/g, '_')
			.replace(/[^\w\-]+/g, '')
			.replace(/\-\-+/g, '_')
			.replace(/^-+/, '')
			.replace(/-+$/, '');
	}

	static listFiles(folder, callback, callback2 = null)
	{
		let enumerator = null;
		const fileComplete = (obj, res) => {
			let files = obj.next_files_finish(res);
			if (files.length) {
				enumerator.next_files_async(100, GLib.PRIORITY_DEFAULT, null, fileComplete);
				files.forEach(file => callback(enumerator.get_child(file)));
			} else {
				enumerator.close(null);
				if(callback2) callback2();
			}
		}
		folder.enumerate_children_async(
			Gio.FILE_ATTRIBUTE_STANDARD_NAME,
			Gio.FileQueryInfoFlags.NONE,
			GLib.PRIORITY_DEFAULT,
			null,
			(object, result) => {
				enumerator = object.enumerate_children_finish(result);
				enumerator.next_files_async(100, GLib.PRIORITY_DEFAULT, null, fileComplete);
			}
		);
	}

	static emptyFolder(folder, removeFolder, callback = null)
	{
		this.listFiles(folder, file => {
			file.delete(null);
		}, () => {
			if(removeFolder) folder.delete(null);
			if(callback) callback();
		});
	}

	static getFileContent(file, callback)
	{
		file.load_contents_async(null, (object, result) => {
			const [ok, content] = object.load_contents_finish(result);
			if(!ok) return callback(null);
			callback(ByteArray.toString(content));
		});
	}
	
	static upFirstLetter(value)
	{
		return value.charAt(0).toUpperCase() + value.slice(1);
	}
	
	static requestPage(data, callback)
	{
		const session = new Soup.SessionAsync();
		const request = Soup.Message.new(data.method, data.uri);
		if(data.headers){
			Object.keys(data.headers).forEach(key => {
				request.request_headers.append(key, data.headers[key]);
			});
		}
		session.queue_message(request, (session, message) => {
			if(message.status_code >= 400)
				return callback(null, message);
			callback(request.response_body.data, message);
		});
	}

	static downloadFile(uri, callback)
	{
	    const session = new Soup.SessionAsync();
		const file = Gio.File.new_for_path(GLib.get_tmp_dir() + '/' + uri.split('/').pop());
	    if(!file.query_exists(null)) file.create(Gio.FileCreateFlags.NONE, null);
	    const fstream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
	    const request = Soup.Message.new('GET', uri);
        request.connect('got_chunk', (message, chunk) => {
            if(message.status_code < 400) fstream.write(chunk.get_data(), null);
        });
        session.queue_message(request, (session, message) => {
            if(message.status_code >= 400) throw new Error('Not Found');
            callback(file);
        });
	}

	static convertImage(file, format)
	{
        const path = file.get_path();
        const newPath = path.split('.')[0] + '.' + format;
        const newFile = Gio.File.new_for_path(newPath);
        if(newFile.query_exists(null)) newFile.delete(null);
        try{
            GLib.spawn_command_line_sync(
			    'convert ' + path + ' ' + newPath
		    );
		}catch(error){
		    throw new Error('Missing ImageMagick');
		}
		file.delete(null);
        return newFile;
	}

}
