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

    const Logger = require('sentinel-common').logger;

    let log = new Logger();
    
    this.devices = {};
    this.scenes = {};
    this.cron = {};

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
                log.error(error);
                return;
            }
            log.info('Message sent: ' + info.response);
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

    this.runInSandbox = (js, currentValue, test, sourceIp) => {

        return new Promise( (fulfill, reject) => {

            let err = null;
            let r = null;

            try{

                let SB = require('./sandbox');
                let sandbox = new SB(this, false, sourceIp);

                if (js.id) {
                    if (!this.state[js.id]) {
                        this.state[js.id] = {};
                    }
                    sandbox['state'] = this.state[js.id];
                }

                log.info( ( test ? 'Testing' : 'Running' ) + ' automation id => ' + js.id + ', "' + js.name + '"');

                sandbox['_device'] = currentValue;
                sandbox['_debug'] = test;

                let context = new vm.createContext(sandbox);

                let code = `
                function __run(){ 
                    ${js.code}
                };

                try{        
                    __run();
                }
                catch(err){
                    log.info(err);
                }                
            `;

                let script = new vm.Script(code, {
                    lineOffset: 1, // line number offset to be used for stack traces
                    columnOffset: 1, // column number offset to be used for stack traces
                    displayErrors: true,
                    timeout: 30000 // ms
                });

                r = script.runInContext(context);
            }
            catch (e) {
                err = e;
            }

            if (test)
                delete this.state[js.id];

            if (err)
                return reject(err);

            fulfill(r);
        });
    };


    this.saveAutomation = (js) => {

        return new Promise( (fulfill, reject) => {

            let subKey =  `/${js.type}/`;

            let path = config.path() + subKey;

            log.info('Saving automation id => ' + js.id + ', "' + js.name + '"');

            global.consul.kv.del(path + js.id, function (err, data) {
                if (err)
                    return reject(err);

                global.consul.kv.set(path + js.id, JSON.stringify(js), function (err, data) {
                    if (err)
                        return reject(err);

                    if ( !that.devices[js.device] )
                        that.devices[js.device] = {};
                    that.devices[js.device][js.id] = js;

                    fulfill();
                });
            });

        });
    };

    this.loadAutomation = (path) => {

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

                        let js = JSON.parse(data.Value);

                        if ( !js ){
                            log.warn('key -> ' + keys[i] + ' was bad -> ' + data.Value);
                        }else{
                            switch (js.type){
                                case 'event':
                                    if ( !that.devices[js.device] )
                                        that.devices[js.device] = {};
                                    that.devices[js.device][js.id] = js;
                                    log.info('loaded event id => ' + js.id + ' for device => ' + js.device);
                                    break;
                                case 'scene':
                                    if ( !that.scenes[js.area] )
                                        that.scenes[js.area] = {};
                                    that.scenes[js.area][js.id] = js;
                                    log.info('loaded scene id => ' + js.id + ' for area => ' + js.area);
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
    };

    this.loadAutomation(config.path());

    if (process.env.DEBUG) {
        let SB = require('./sandbox');
        let sandbox = new SB(this, false, '');

        sandbox.findDeviceByType('switch');
    }
}

exports = module.exports = automation;
