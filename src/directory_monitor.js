const {Gio} = imports.gi;

var DirectoryMonitor = class
{

    constructor(directory)
    {
        this.cancellable = Gio.Cancellable.new();
        this.monitor = directory.monitor_directory(
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
