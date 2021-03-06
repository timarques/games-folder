const {Gio} = imports.gi;

var Monitor = class
{

    constructor(file, type)
    {
        this.cancellable = Gio.Cancellable.new();
        this.monitor = file['monitor_'+type](
        	Gio.FileMonitorFlags.WATCH_MOVES, this.cancellable
        );
    }

    connect(callback)
    {
        this.monitor.connect('changed', (monitor, file, otherFile, eventType) => {
            callback(file, eventType);
        });
    }

    cancel()
    {
        if (!this.cancellable.is_cancelled()) this.cancellable.cancel();
    }

}
