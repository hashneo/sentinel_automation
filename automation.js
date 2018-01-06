function automation(config) {

    if ( !(this instanceof automation) ){
        return new automation(config)
    }

    const vm = require('vm');

    const uuid = require('uuid');
    const mailer = require('nodemailer');

    const request = require('request');

    const server = require('./server');

    const messageHandler = require('./messageHandler');

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
                console.error(error);
                return;
            }
            console.log('Message sent: ' + info.response);
        });
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
/*
    this.call = (url, complete) => {

        let options = {
            "rejectUnauthorized": false,
            "url": 'http://127.0.0.1:' + (process.env.PORT) + '' + url,
            "method": "GET",
            "headers": {
                "Authorization": automationJwt
            }
        };

        request(options, complete);
    };
*/
    this.runForDevice = ( id, currentValue ) =>{

        if ( that.devices[id] ) {
            that.run(  that.devices[id], currentValue );
        }
    };

    this.run = ( events, currentValue ) => {
        for( let k in events ){
            that.runInSandbox(events[k], currentValue, false);
        }
    };

    this.runInSandbox = (js, currentValue, test) => {

        let SB = require('./sandbox');
        let sandbox = new SB(this, false);

        if ( js.id ) {
            if ( !this.state[js.id] ) {
                this.state[js.id] = {};
            }
            sandbox['state'] = this.state[js.id];
            //console.log( JSON.stringify( sandbox['state'], null,  '  ' ) );
        }

        console.log('Running automation id => ' + js.id + ', "' + js.name + '"');

        sandbox['_device'] = currentValue;

        let context = new vm.createContext(sandbox);

        let code = `
        function __run(){
             ${js.code} 
         };
         __run();
        `;

        let script = new vm.Script( code, {
                                                lineOffset: 1, // line number offset to be used for stack traces
                                                columnOffset: 1, // column number offset to be used for stack traces
                                                displayErrors: true,
                                                timeout: 30000 // ms
                                             });

        let err = null;

        let r = null;

        try{
            r = script.runInContext(context);
        }
        catch( e ) {
            err = e;
        }

        if (test)
            delete this.state[js.id];

        if ( err )
            throw err;

        return 1;
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
                            console.log('key -> ' + keys[i] + ' was bad -> ' + data.Value);
                        }else{
                            switch (js.type){
                                case 'event':
                                    if ( !that.devices[js.device] )
                                        that.devices[js.device] = {};
                                    that.devices[js.device][js.id] = js;
                                    console.log('loaded event id => ' + js.id + ' for device => ' + js.device);
                                    break;
                                case 'scene':
                                    if ( !that.scenes[js.area] )
                                        that.scenes[js.area] = {};
                                    that.scenes[js.area][js.id] = js;
                                    console.log('loaded scene id => ' + js.id + ' for area => ' + js.area);
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
}

exports = module.exports = automation;
