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
    getConnected(callback,pool) {
        if (this.connection) {
            return callback(this.connection);
        }
        this.callbacks.push(callback);
        if (this.loading == true)
            return;
        this.loading = true;
        pool.getConnection((err, connection)=> {
            if (err) {
                console.log(err);
            }
            this.uploaded(connection);
        });
    },
    initiationTranslation(callback) {
        const withchange=(callback)=> {
            this.connection.beginTransaction(()=> {
                return callback(this.connection, (success, error)=> {
                    this.commit(success);
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
        this.connection.commit( (result, err)=> {
            if (err) {
                this.connection.rollback(function () {
                    if (callback)
                        callback(false);
                });
            } else if (callback)
                callback(true);
        });
    },
    rollback() {
        if (!this.connection)
            return;
        this.connection.rollback(function () {
        });
    }
};
module.exports = Context;