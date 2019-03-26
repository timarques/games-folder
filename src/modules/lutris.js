const {Gda, GLib} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;
const {Game} = Me.imports.game;

class LutrisGame extends Game
{

    constructor(iterator)
    {
        const id = iterator.get_value_for_field('id');
        super({
            id: id,
            command: 'lutris lutris:rungameid/' + id,
            name: iterator.get_value_for_field('name'),
            collection: iterator.get_value_for_field('runner'),
            hide: true
        });
    }

}

var Lutris = class
{

    constructor()
    {
        this.connection = Gda.Connection.open_sqlite(
            GLib.get_home_dir() + '/.local/share/lutris',
            'pga.db',
            false
        );
        this.connection.connect();
    }

    find(id)
    {
        const results = this.connection.execute_select_command(
            'SELECT id, runner, steamid FROM games LIMIT 1'
        );
    }

    findAll()
    {
        log('GamesFolder: Lutris FindAll method');
        const results = this.connection.execute_select_command(
            'SELECT id, runner, steamid FROM games'
        );
        const iterator = results.create_iter();
        while(iterator.move_next()){
            log(iterator.get_value_for_field('id'));
            if(iterator.get_value_for_field('steamid')) continue;
        }
    }

}
