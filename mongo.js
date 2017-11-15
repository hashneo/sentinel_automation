'use strict';

const flatten = require('flat');
const guid = require('node-uuid');

function mongo(){

    const MongoClient = require('mongodb').MongoClient;

    var connection = undefined;

    this.connect = (config) => {

        return new Promise((fulfill, reject) => {

            MongoClient.connect('mongodb://' + ( config.host || 'localhost' ) + ':' + ( config.port || '27017' ) + '/' + config.database, (err, _connection) => {
                if (err)
                    return reject(err);

                connection = _connection;

                console.log("mongo => We are connected");

                fulfill(this);
            });
        });
    };

    this.createCollection = (name) => {

        return new Promise((fulfill, reject) => {
            connection.createCollection(name, (err, _collection) => {
                if (err)
                    return reject(err);

                fulfill(new collection(_collection, name));
            });
        });
    };
}

function collection(_c,_n){
    var c = _c;
    var n = _n;

    this.find = (uuid, id, criteria) => {

        return new Promise( (fulfill, reject) => {

            if ( uuid === id === criteria === undefined )
                return reject('invalid parameters for find');

            let query = {
                bucket: n
            };

            if ( uuid ){
                query['owner'] = uuid;
            }

            if ( id ){
                query['_id'] = id;
            }

            if ( criteria !== undefined ){
                query['value'] = criteria;
                query = flatten(query);
            }

            c.find(query).toArray(
                (err, docs) => {
                    if (err) {
                        reject(err);
                    } else {
                        if (docs && docs.length > 0) {
                            var data = [];
                            docs.forEach( (d) => {
                                d.value['id'] = d._id;
                                // If you did not ask for an owner then I will return
                                // the owner so you can do some checks afterwards
                                if ( !uuid )
                                    d.value['_owner'] = d.owner;
                                data.push(d.value);
                            });
                            fulfill(data);
                        }else {
                            fulfill(null);
                        }
                    }
                }
            );
        });
    };

    this.insert = (uuid, value) => {

        return new Promise( (fulfill, reject) => {

            let data = {
                _id : value.id,
                bucket: n,
                owner: uuid,
                value: value
            };

            if ( !data._id )
                data._id = guid.v4();

            delete value.id;

            c.insert( data,
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        data.value['id'] = data._id;
                        fulfill(data.value);
                    }
                }
            );
        });
    };

    this.replace = (uuid, value) => {

        return new Promise( (fulfill, reject) => {

            let key = {
                _id: value.id,
                bucket: n,
                owner: uuid
            };

            delete value.id;

            var data = Object.assign({}, key, { value } );

            c.update( key, data,
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        data.value['id'] = data._id;
                        fulfill(data.value);
                    }
                }
            );
        });
    };

    this.delete = (uuid, value) => {

        return new Promise( (fulfill, reject) => {

            let key = {
                _id: value.id,
                bucket: n,
                owner: uuid
            };

            c.deleteOne( key,
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        fulfill();
                    }
                }
            );
        });
    };

    this.drop = () => {
        return new Promise( (fulfill, reject) => {
            c.drop( (err, result) =>  {
                if ( err )
                    reject(err);
                else
                    fulfill(result);
            });
        });
    }
}

module.exports = new mongo();