"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid");
class Context {
    constructor() {
        this.callbacks = [];
        this.id = uuid.v4();
    }
    uploaded(connection) {
        this.connection = connection;
        this.loading = false;
        for (const callback of this.callbacks) {
            callback(this.connection);
        }
    }
    getConnected(callback, pool) {
        if (this.connection) {
            return callback(this.connection);
        }
        this.callbacks.push(callback);
        if (this.loading === true) {
            return;
        }
        this.loading = true;
        pool.getConnection((err, connection) => {
            if (err) {
                throw err;
            }
            this.uploaded(connection);
        });
    }
    initiationTransaction(callback, pool) {
        const withchange = (callback) => {
            this.connection.beginTransaction(() => {
                return callback(this.connection, (success, error) => {
                    this.commit(success);
                });
            });
        };
        if (this.connection) {
            return withchange(callback);
        }
        this.getConnected((connection) => {
            withchange(callback);
        }, pool);
    }
    release() {
        if (this.connection) {
            this.connection.release();
        }
    }
    commit(callback) {
        if (!this.connection) {
            return;
        }
        this.connection.commit((result, err) => {
            if (err) {
                this.connection.rollback(() => {
                    if (callback) {
                        callback(false);
                    }
                });
            }
            else if (callback) {
                callback(true);
            }
        });
    }
    rollback() {
        if (!this.connection) {
            return;
        }
        this.connection.rollback();
    }
}
exports.default = Context;
//# sourceMappingURL=Context.js.map