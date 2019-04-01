const {Gda, GLib} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const {Utils} = Me.imports.utils;
const {Game} = Me.imports.game;

class LutrisGame extends Game
{

    constructor(config, connection)
    {
        const slug = file.get_basename().split('-').splice(-1,1).join('-');
        const sqlBuilder = new Gda.SqlBuilder({
            stmt_type: Gda.SqlStatementType.SELECT
        });
        const stmt = sqlBuilder.get_statement();
        sqlBuilder.select_add_target('games', null);
        sqlBuilder.select_add_field('name', null, null);
        sqlBuilder.select_add_field('slug', null, null);
        sqlBuilder.select_add_field('installer-slug', null, null);
        sqlBuilder.select_add_field('runner', null, null);
        sqlBuilder.set_where(
             sqlBuilder.add_cond(
                Gda.SqlOperatorType.EQ,
                sqlBuilder.add_field_id("installer-slug", null),
                SqlBuilder.add_expr_value(null, slug),
                0
            )
        );
        const data = connection.statement_execute_select(stmt, null);
        log(data.dump_as_string());
        /*super({
            id: slug,
            command: 'lutris lutris:rungameid/' + id,
            collection: 'lutris_' +
        });*/

    }

}

var Lutris = class
{

    constructor()
    {
        this.directory = Gio.File.new_for_path(
            GLib.get_home_dir() + '/.local/share/lutris'
        );
        this.connection = Gda.Connection.open_sqlite(
            GLib.get_home_dir() + '/.local/share/lutris',
            'pga.db',
            false
        );
        this.connection.connect();
    }

    find(gameConfig, callback)
    {
        callback(new LutrisGame(gameConfig, this.connection));
    }

    findAll(callback)
    {
        Utils.listFiles(this.directory, file => this.find(file, callback));
    }

}
