const uuid = require('uuid');
function Context() {
    this.callbacks = [];
    this.id = uuid.v4();
}
Context.prototype = {
    uploaded(connection) {
        this.connection = connection;
        this.loading = false;
        for (var i = 0; i < this.callbacks.length; i++) {
            this.callbacks[i](this.connection);
        }
    },
    getConnected(callback) {
        var me = this;
        if (this.connection) {
            return callback(this.connection);
        }
        this.callbacks.push(callback);
        if (this.loading == true)
            return;
        this.loading = true;
        pool.getConnection(function (err, connection) {
            if (err) {
                console.log(err);
            }
            me.uploaded(connection);
        });
    },
    initiationTranslation(callback) {
        var me = this;
        function withchange(callback) {
            me.connection.beginTransaction(function () {
                return callback(me.connection, function (success, error) {
                    me.commit(success);
                });
            });
        }
        if (this.connection)
            return withchange(callback);
        this.getConnected(function (connection) {
            withchange(callback);
        });
    },
    release() {
        if (this.connection) {
            this.connection.release();
        }
    },
    commit(callback) {
        if (!this.connection)
            return;
        var me = this;
        me.connection.commit(function (result, err) {
            if (err) {
                me.connection.rollback(function () {
                    if (callback)
                        callback(false);
                });
            } else if (callback)
                callback(true);
        });
    },
    roolback() {
        if (!this.connection)
            return;
        this.connection.rollback(function () {
        });
    }
};
module.exports = Context;