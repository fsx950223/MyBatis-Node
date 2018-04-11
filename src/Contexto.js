var uuid = require('uuid');
var domain = require('domain');


function Contexto() {
    this.callbacks = [];
    this.id = uuid.v4();
}

Contexto.prototype = {

    carregou (connection){
        this.conexao = connection ;
        this.carregando = false;
        for(var i=0; i< this.callbacks.length; i++) {
            this.callbacks[i](this.conexao);
        }
    },

    obtenhaConexao(callback){
        var me = this;
        if(this.conexao) {
            return callback(this.conexao);
        }

        this.callbacks.push(callback);

        if( this.carregando ==true) return;


        this.carregando = true;
        pool.getConnection(function (err, connection) {
            if( err ) { console.log(err); }

            me.carregou(connection);
        });
    },

    inicieTransacao(callback){
        var me = this;

        var dominio = require('domain').active;

        function comTransacao(callback){
            me.conexao.beginTransaction(dominio.intercept(function() {
                return callback(me.conexao, function(success,error) {
                    me.commit(success);
                });
            }));
        }

        if(this.conexao)
            return comTransacao(callback)

        this.obtenhaConexao(function(conexao){
            comTransacao(callback);
        })
    },


    release(){
        if(this.conexao){

            this.conexao.release();
        }

    },

    commit(callback){
        if(!this.conexao) return;

        var me = this;

        var dominio = require('domain').active;

        me.conexao.commit(dominio.intercept(function(result,err) {
            if (err) {
                me.conexao.rollback(function() {
                    if(callback) callback(false);
                });
            } else  if(callback) callback(true);

        }));
    },

    roolback(){
        if(!this.conexao) return

        this.conexao.rollback(function() {

        });
    }

}

function domainMiddleware(req, res, next) {
    var reqDomain = domain.create();

    reqDomain.add(req);
    reqDomain.add(res);

    reqDomain.id = uuid.v4();
    reqDomain.contexto = new Contexto();

    res.on('close', function () {
        //reqDomain.dispose();
        if( reqDomain.contexto ) {
            reqDomain.contexto.release();
        }
    });

    res.on('finish', function () {
        if( reqDomain.contexto ) {
            reqDomain.contexto.release();
            reqDomain.contexto = null;
            reqDomain.id = null;
            //reqDomain.dispose();
        }
    });


    reqDomain.on('error', function (er) {
        try {
            if(reqDomain.contexto )
                reqDomain.contexto.release();

        } catch (er) {
            console.error('Error sending 500', er, req.url);
        }

        console.log('relancando o erro...')

        throw er;
    });

    reqDomain.run(next);

};

function middlewareOnError(err, req, res, next) {
    var reqDomain = domain.active;

    if( reqDomain.contexto ) {
        reqDomain.contexto.release();
        reqDomain.contexto = null;
    }

    reqDomain.id = null;

    next(err);
}

module.exports = Contexto;
module.exports.domainMiddleware = domainMiddleware;
module.exports.middlewareOnError = middlewareOnError;



