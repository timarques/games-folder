const {Gio, GLib, GObject} = imports.gi;
const GioSSS = Gio.SettingsSchemaSource;
const Me = imports.misc.extensionUtils.getCurrentExtension();

var Games = GObject.registerClass(
	class GamesSettings extends Gio.Settings
	{

		_init()
		{
		    super._init({
		        schema_id: 'org.gnome.desktop.app-folders.folder',
		        path: '/org/gnome/desktop/app-folders/folders/Games/'
		    });
		}

		get apps()
		{
			return this.get_strv('apps');
		}
		
		get excludedApps()
		{
			return this.get_strv('excluded-apps');
		}
		
		get categories()
		{
			return this.get_strv('categories');
		}
		
		get name()
		{
			return this.get_string('name');
		}
		
		get translate()
		{
			return this.get_boolean('translate');
		}
		
		set apps(apps)
		{
			this.set_strv('apps', apps);
		}
		
		set excludedApps(apps)
		{
			this.set_strv('excluded-apps', apps);
		}
		
		set categories(categories)
		{
			this.set_strv('categories', categories);
		}
		
		set name(name)
		{
			this.set_string('name', name);
		}
		
		set translate(translate)
		{
			this.set_boolean('translate', translate);
		}
		

		addApp(app)
		{
		    const apps = this.apps;
		    if(!apps.includes(app)) this.apps = apps.concat(app);
		}

		removeApp(app)
		{
		    const apps = this.apps;
		    apps.splice(apps.indexOf(app), 1);
		    this.apps = apps;
		}

		reset()
		{
		    super.reset('name');
		    super.reset('translate');
		    super.reset('apps');
		    super.reset('categories');
		    super.reset('excluded-apps');
		}

	}
);

var Folders = GObject.registerClass(
	class FoldersSettings extends Gio.Settings
	{

		_init()
		{
		    super._init({schema_id: 'org.gnome.desktop.app-folders'});
		}

		get values()
		{
		    return this.get_strv('folder-children');
		}

		set values(values)
		{
		    this.set_strv('folder-children', values);
		}

		add(folder)
		{
		    const folders = this.values;
		    if(!folders.includes(folder))
		        this.values = folders.concat(folder);
		}

		remove(folder)
		{
		    const folders = this.values;
		    folders.splice(folders.indexOf(folder), 1);
		    this.values = folders;
		}

		reset()
		{
			this.reset('folder-children');
		}

	}
);

var Configurations = GObject.registerClass(
	class ConfigurationsSettings extends Gio.Settings
	{
		
		_init()
		{
			const schema = Me.metadata['settings-schema'];
			const schemaDir = Me.dir.get_child('schemas');
			let schemaSource;
			if (schemaDir.query_exists(null)){
				schemaSource = GioSSS.new_from_directory(
					schemaDir.get_path(),
					GioSSS.get_default(),
					false
				);
			} else schemaSource = GioSSS.get_default();
			let schemaObj = schemaSource.lookup(schema, true);
			super._init({ settings_schema: schemaObj });
		}
		
		get name()
		{
			return this.get_string('name');
		}
		
		get directories()
		{
			return this.get_strv('directories');
		}
		
		get modules()
		{
			return this.get_strv('modules');
		}
		
		set name(name)
		{
			this.set_string('name', name);
		}
		
		set directories(directories)
		{
			this.set_strv('directories', directories);
		}
		
		set modules(modules)
		{
			this.set_strv('modules', modules);
		}

	}
);
