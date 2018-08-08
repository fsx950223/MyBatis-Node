import * as uuid from "uuid";
class Context {
    public callbacks;
    public id;
    public connection;
    public loading;
    constructor() {
        this.callbacks = [];
        this.id = uuid.v4();
    }
    public uploaded(connection) {
        this.connection = connection;
        this.loading = false;
        for (const callback of this.callbacks) {
            callback(this.connection);
        }
    }
    public getConnected(callback, pool) {
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
    public initiationTransaction(callback, pool) {
        const withchange = (callback) => {
            this.connection.beginTransaction(() => {              
                const res=callback();
                if(res instanceof Promise){
                    res.then(()=> {
                        if (this.connection) {
                            this.connection.commit((err)=>{
                                if (err&&this.connection) {                              
                                    return this.connection.rollback(function() {
                                        throw err;
                                    });
                                }else{
                                    throw err;
                                }
                            })
                        }
                      }).catch(err=>{
                        if (this.connection) {
                            return this.connection.rollback(function() {
                                throw err;
                            });
                        }else{
                            throw err;
                        }
                    })
                }else{
                    return res
                }
            });
        };
        if (this.connection) {
            return withchange(callback);
        }
        this.getConnected((connection) => {
            withchange(callback);
        }, pool);
    }
    public release() {
        if (this.connection) {
            this.connection.release();
        }
    }
    public commit(callback) {
        if (!this.connection) {
            return;
        }
        this.connection.commit( (result, err) => {
            if (err) {
                this.connection.rollback(() => {
                    if (callback) {
                        callback(false);
                    }
                });
            } else if (callback) {
                callback(true);
                   }
        });
    }
    public rollback() {
        if (!this.connection) {
            return;
        }
        this.connection.rollback();
    }
}
export default Context;
