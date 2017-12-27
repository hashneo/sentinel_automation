'use strict';

const auth = require('sentinel-common').auth;
const request = require('request');

function server() {

    function call(url) {

        let baseUrl = 'http://localhost:5000';

        return new Promise((fulfill, reject) => {

            auth.login(baseUrl, global.config.auth)
                .then((jwt) => {
                    let options = {
                        uri: baseUrl + url,
                        headers: {
                            'Authorization': `Bearer ${jwt}`
                        },
                        method: 'GET'
                    };
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
    }

    function loadSystem() {
        return call('/api/system');
    }

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

let s = new server();

module.exports = s;

s.findDeviceByType();