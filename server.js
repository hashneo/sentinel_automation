'use strict';

const auth = require('sentinel-common').auth;
const request = require('request');

const Logger = require('sentinel-common').logger;

let log = new Logger();

function server() {

    const that = this;

    this.call = (url) => {

        if ( !url.startsWith('/api/') ){
            url = '/api' + url;
        }

        return new Promise((fulfill, reject) => {

            auth.login(global.auth.endpoint, global.config.auth)
                .then((jwt) => {
                    let options = {
                        uri: global.server.endpoint + url,
                        headers: {
                            'Authorization': `Bearer ${jwt}`
                        },
                        method: 'GET'
                    };

                    log.info('calling => ' + options.uri );

                    request(options, (err, resp, body) => {
                        if (err) {
                            return reject(err);
                        }

                        if (resp.statusCode != 200) {
                            return reject(new Error(resp.statusCode));
                        }

                        try {
                            body = JSON.parse(body);

                            if ( body.result !== 'ok' ) {
                                return reject(new Error('result was not ok'));
                            }

                            fulfill(body.data);
                        }
                        catch (err) {
                            return reject(err);
                        }
                    });
                })
                .catch((err) => {
                    reject(err);
                });
        });
    };

    function loadSystem() {
        return that.call('/api/system');
    }

    this.getDeviceStatus = (id) => {
        return new Promise((fulfill, reject) => {
            this.call(`/api/device/${id}/status`)
                .then((status) => {
                    fulfill(status[0]);
                })
                .catch((err) => {
                    reject(err);
                })
        });
    };

    this.findDeviceByType = (type) => {
        return new Promise((fulfill, reject) => {
            loadSystem()
                .then((system) => {
                    let results = [];

                    system.devices.forEach( (device) =>{
                        if ( device.type === type )
                            results.push(device);
                    });

                    fulfill(results);
                })
                .catch((err) => {
                    reject(err);
                })
        });
    };

    this.findDevice = (name) => {
        return new Promise((fulfill, reject) => {
            loadSystem()
                .then((system) => {
                    system.devices.forEach( (device) =>{
                        if ( device.name === name || device.id == name )
                            return fulfill( device );
                    });

                    fulfill(null);
                })
                .catch((err) => {
                    reject(err);
                })
        });
    };


    this.findScene = (area, name) => {
    };

}

module.exports = new server();
