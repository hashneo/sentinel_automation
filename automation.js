function automation(config) {

    if ( !(this instanceof automation) ){
        return new automation(config)
    }

    const uuid = require('uuid');
    const mailer = require('nodemailer');

    const request = require('request');

    const server = require('./server');

    const messageHandler = require('./messageHandler');

    const vm = require('vm');

    const logger = require('sentinel-common').logger;

    var streams = require('memory-streams');

    this.devices = {};
    this.scenes = {};
    this.cron = require('node-cron');

    this.state = {};

    this.scripts = [];

    const that = this;

    this.findScene = (area, name) => {

        if (scenes[area] === undefined)
            return null;

        return scenes[area][name];
    };

    this.sms = (to, text) => {

        if ( global.config.sms === undefined ){
            throw new Error('Outbound sms is not configured');
        }

        // Twilio Credentials
        let accountSid = global.config.sms.account.sid;
        let authToken = global.config.sms.account.token;

        //require the Twilio module and create a REST client
        let client = require('twilio')(accountSid, authToken);

        client.messages.create({
            to: to,
            from: global.config.sms.number,
            body: text,
        }, function (err, message) {
        });
    };

    this.email = (to, subject, text, html) => {

        if ( global.config.email === undefined ){
            throw new Error('Outbound email is not configured');
        }

        let mailOptions = {
            from: global.config.email.sender,
            to: to,
            subject: subject,
            text : text,
        };

        let transportOptions = global.config.email.options;

        let transporter = mailer.createTransport(transportOptions);

        // send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                logger.error(error);
                return;
            }
            logger.info('Message sent: ' + info.response);
        });
    };

    this.getDeviceStatus = (id) => {
        return server.getDeviceStatus(id);
    };

    this.findDeviceByType = (type) => {
        return server.findDeviceByType(type);
    };

    this.findDevice = (name) => {
        return server.findDevice(name);
    };

    this.findScene = (area, name) => {
        return server.findScene(area, name);
    };

    this.call = (url) => {
        return server.call(url);
    };

    this.runForDevice = ( id, currentValue ) =>{
        if ( that.devices[id] ) {
            that.run( that.devices[id], currentValue );
        }
    };

    this.run = ( events, currentValue ) => {
        let p = [];
        for( let k in events ){
            p.push( that.runInSandbox(events[k], currentValue, false) );
        }
        Promise.all(p);
    };

    this.runInSandbox = (js, currentValue, test) => {

        return new Promise( (fulfill, reject) => {

            try{

                let SB = require('./sandbox');

                let logStream;

                if (test)
                    logStream = new streams.WritableStream();

                let sandbox = new SB(this, logStream);

                if (js.id) {
                    if (!this.state[js.id]) {
                        this.state[js.id] = {};
                    }
                    sandbox['state'] = this.state[js.id];
                }

                logger.info( ( test ? 'Testing' : 'Running' ) + ' automation id => ' + js.id + ', "' + js.name + '"');

                sandbox['_device'] = currentValue;
                sandbox['_debug'] = test;

                sandbox['complete'] = function(result){
                    if (!sandbox._complete) {
                        sandbox._complete = true;
                        fulfill({
                            result: result,
                            log: logStream.toString()
                        });
                    }
                };
                sandbox['failed'] = function(err){
                    if (!sandbox._complete) {
                        sandbox._complete = true;
                        reject(err);
                    }
                };

                let context = new vm.createContext(sandbox);

                sandbox['_complete'] = false;

                let code = `
                function __run(){
                    try{      
                    ${js.code}
                    } 
                    catch(err){
                        failed(err);
                    }
                };

                __run();
                
                setTimeout(function() {
                    failed('timeout');
                }, 60000);
                `;

                let options = {
                    lineOffset: 1, // line number offset to be used for stack traces
                    columnOffset: 1, // column number offset to be used for stack traces
                    displayErrors: true,
                    timeout: 5000 // ms
                };

                vm.runInContext(code, context, options);
            }
            catch (err) {
                return reject(err);
            }
/*
            if (test)
                delete this.state[js.id];
*/
        });
    };


    this.saveAutomation = (js) => {

        return new Promise( (fulfill, reject) => {

            let subKey =  `/${js.type}/`;

            let path = config.path() + subKey;

            logger.info('Saving automation id => ' + js.id + ', "' + js.name + '"');

            global.consul.kv.del(path + js.id, function (err, data) {
                if (err)
                    return reject(err);

                global.consul.kv.set(path + js.id, JSON.stringify(js), function (err, data) {
                    if (err)
                        return reject(err);

                    switch (js.type) {
                        case 'event':
                            if (!that.devices[js.device])
                                that.devices[js.device] = {};
                            that.devices[js.device][js.id] = js;

                            logger.info('saved event id => ' + js.id + ' for device => ' + js.device);

                            break;
                        case 'scene':
                            if (!that.scenes[js.area])
                                that.scenes[js.area] = {};

                            that.scenes[js.area][js.id] = js;
                            logger.info('saved scene id => ' + js.id + ' for area => ' + js.area);

                            break;
                    }

                    fulfill();
                });
            });

        });
    };

    function load(path){

        return new Promise( (fulfill, reject) => {

            global.consul.kv.keys(path,  (err, keys) => {

                if (err)
                    reject(err);

                for (let i = 1; i < keys.length; i++) {

                    if ( keys[i].endsWith('/') )
                        continue;

                    global.consul.kv.get(keys[i], (err, data) => {

                        if (err)
                            reject(err);

                        let js;

                        try {
                            js = JSON.parse(data.Value);
                        }
                        catch(err) {
                            logger.err(err);
                        }

                        if ( !js ){
                            logger.warn('key -> ' + keys[i] + ' was bad -> ' + data.Value);
                        }else{
                            switch (js.type){
                                case 'event':
                                    if ( !that.devices[js.device] )
                                        that.devices[js.device] = {};

                                    if ( !that.devices[js.device][js.id] ) {
                                        that.devices[js.device][js.id] = js;
                                        logger.info('loaded event id => ' + js.id + ' for device => ' + js.device);
                                    }
                                    break;
                                case 'scene':
                                    if ( !that.scenes[js.area] )
                                        that.scenes[js.area] = {};

                                    if ( !that.scenes[js.area][js.id] ) {
                                        that.scenes[js.area][js.id] = js;
                                        logger.info('loaded scene id => ' + js.id + ' for area => ' + js.area);
                                    }
                                    break;
                                case 'schedule':
                                    break;
                            }
                        }
                    });
                }

                fulfill();
            });

        });
    }

    this.loadAutomation = () => {
        return load(config.path());
    };

    this.loadAutomation();

    setInterval( this.loadAutomation, 10000 );

    if (process.env.DEBUG) {
        let SB = require('./sandbox');
        let sandbox = new SB(this);

        sandbox.findDeviceByType('switch');

        let testCode = `
        var promise1 = new Promise( (resolve, reject) => {
            setTimeout(function() {
                resolve('foo');
            }, 1000);
        });
        
        promise1
        .then( (x) => {
            console.log('completed with result => ' + x );
            complete(x);
        })
        .catch( (err) => {
            failed(err);
        })
        `;

        this.runInSandbox({ code: testCode}, {}, true, null )
            .then( (result) => {
            })
            .catch( (err) => {
                logger.error(err);
            })

    }
}

exports = module.exports = automation;
