'use strict';

function messageHandler() {

    const redis = require('redis');

    const uuid = require('uuid');

    let sub = redis.createClient(
        {
            host: process.env.REDIS || global.config.redis || '127.0.0.1',
            socket_keepalive: true,
            retry_unfulfilled_commands: true
        }
    );

    sub.on('end', function (e) {
        console.log('Redis hung up, committing suicide');
        process.exit(1);
    });

    sub.on('pmessage', function (channel, pattern, message) {

        let data = JSON.parse(message);

        switch (pattern) {
            case 'sentinel.module.start':
            case 'sentinel.module.running':
                if ( data.name === 'auth'){
                    console.log( 'Authentication server set to => ' + data.endpoint );
                    global.auth = data;
                }
                break;

            case 'sentinel.device.insert':
                break;

            case 'sentinel.device.update':

                // Ignore from server
                if ( data.module === 'server'){
                    if ( global.auth ) {
                        global.module.runForDevice(data.id, data.value);
                    }
                }

                break;
        }
    });

    sub.psubscribe("sentinel.*");
}

module.exports = new messageHandler();