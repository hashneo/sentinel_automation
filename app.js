'use strict';

require('newrelic');

const SwaggerExpress = require('swagger-express-mw');
const SwaggerUi = require('swagger-tools/middleware/swagger-ui');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const redis = require('redis');
const logger = require('sentinel-common').logger;


/*
const memwatch = require('memwatch-next');

memwatch.on('leak', (info) => {
    console.error('Memory leak detected:\n', info);
    //process.exit(1);
});
*/

const uuid = require('uuid');

const consul = require('consul')( {
    host: process.env.CONSUL || '127.0.0.1',
    promisify: true
});

let moduleName = 'automation';

app.use(bodyParser.json({limit: '50mb'}));
app.use(cookieParser());

global.consul = consul;

consul.kv.get(`config/sentinel/${moduleName}`, function(err, result) {
    if (err) throw err;

    if (!result)
        result = { Value : null };

    let config = JSON.parse(result.Value);

    if (!config)
        config = {};

    config.save = () => {
        return new Promise( (fulfill, reject) => {
            consul.kv.set( `config/sentinel/${moduleName}`, JSON.stringify(config, null, '\t'), function(err, result) {
                if (err)
                    return reject(err);
                fulfill(result);
            })
        });
    };

    config.path = () => {
        return `config/sentinel/${moduleName}`;
    };

    global.config = config;
    global.config.save();

    global.auth = {'endpoint': `http://${process.env.SENTINEL_AUTHENTICATION_SERVICE_HOST}:${process.env.SENTINEL_AUTHENTICATION_SERVICE_PORT_HTTP}`};
    global.server = {'endpoint': `http://${process.env.SENTINEL_APP_SERVICE_HOST}:${process.env.SENTINEL_APP_SERVICE_PORT_HTTP}`};

    if (process.env.DEBUG) {
        global.auth = {'endpoint': 'https://home.steventaylor.me'};
        global.server = {'endpoint': 'https://home.steventaylor.me'};
    }

    const securityHandlers = require('sentinel-common').securityHandlers;

    let appConfig = {
        appRoot: __dirname, // required config
        swaggerSecurityHandlers: {
            Oauth:(req, authOrSecDef, scopesOrApiKey, cb) => {
                securityHandlers.Oauth(req, authOrSecDef, scopesOrApiKey, cb);
            }
        }
    };

    SwaggerExpress.create(appConfig, function (err, swaggerExpress) {
        if (err) {
            throw err;
        }

        app.use(SwaggerUi(swaggerExpress.runner.swagger));
        // install middleware
        swaggerExpress.register(app);

        let serviceId = process.env.SERVICE_ID || uuid.v4();

        let port = process.env.PORT || undefined;
        let server = app.listen(port, () => {

            let host = process.env.HOST || process.env.SERVICE_NAME || require('ip').address();
            let port = server.address().port;

            let module = {
                id: serviceId,
                name: moduleName,
                address: host,
                port: port,
                active: true,
                endpoint : `http://${host}:${port}`,
                check: {
                    http: `http://${host}:${port}/health?id=${serviceId}`,
                    interval: '15s'
                }
            };

            process.env.SERVICE_ID = serviceId;

            let pub = redis.createClient(
                {
                    host: process.env.REDIS || global.config.redis || '127.0.0.1',
                    socket_keepalive: true,
                    retry_unfulfilled_commands: true
                }
            );

            pub.on('ready', function(e){

                pub.publish( 'sentinel.module.start', JSON.stringify( module, '\t' ) );

                setInterval( () => {
                    pub.publish('sentinel.module.running', JSON.stringify(module, '\t'));
                }, 5000 );

                if (swaggerExpress.runner.swagger.paths['/health']) {
                    console.log(`you can get /health?id=${serviceId} on port ${port}`);
                }
                global.module = require(`./${moduleName}.js`)(config);
            });

        });

    });

});

process.on('unhandledRejection', (reason, p) => {
    if ( reason && reason.stack && reason.stack.includes('(evalmachine.') ){
        logger.error(reason);
    } else {

        logger.error('Unhandled Rejection at: Promise', p, 'reason:', reason);

        if ( p._trace && p._trace.stack )
            logger.error( p._trace.stack );

        //process.exit(1);
    }
});

module.exports = app;
