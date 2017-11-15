function sandbox(automation, test){
    let that = this;

    const fs = require('fs');

    this.console = new function () {
        this.log = function (m) {
            console.log(m);
        }
    };

    this.setImmediate = function(){
        return setImmediate.apply( this, arguments );
    };

    this.setInterval = function(){
        return setInterval.apply( this, arguments );
    };

    this.setTimeout = function(){
        return setTimeout.apply( this, arguments );
    };

    this.clearImmediate = function(){
        return clearImmediate.apply( this, arguments );
    };

    this.clearInterval = function(){
        return clearInterval.apply( this, arguments );
    };

    this.clearTimeout = function(){
        clearTimeout.apply( this, arguments );
    };

    this.sms = function(to, text){
        return automation.sms(to, text);
    };

    this.email = function(to, subject, text, html){
        return automation.email(to, subject, text, html);
    };

    this.wait = function( ms ){
        let done = false;
        setTimeout(function(){
            done = true;
        }, ms);
        require('deasync').loopWhile(function(){return !done;});
    };

    function getFunctions(device){

        let deviceType = device.type;

        let codeFile = __dirname + '/functions/' + deviceType + '.js';

        let parts = deviceType.split('.');

        while ( !fs.existsSync(codeFile) ){
            parts.pop();

            // If there is no code associated with the
            // device type, return
            if ( parts.length == 0 ){
                console.log('sandbox => ' + device.type + ' does not have a function code file.');
                return [];
            }

            codeFile = __dirname + '/functions/' + parts.join('.') + '.js';
        }

        return require(codeFile);
    }

    this.findDeviceByType = function(type){
        let devices = automation.findDeviceByType(type);

        for ( let i in devices ){
            let device = devices[i];

            try {
                let functions = getFunctions(device);

                let m = new functions(that, device.id);

                for (let k in m) {
                    if (m.hasOwnProperty(k)) {
                        device[k] = m[k];
                    }
                }
            }
            catch( e ){
                console.log('sandbox => ' + e.message);
            }

        }

        return devices;
    };

    this.findDevice = function(name){
        let device = automation.findDevice(name);

        try {
            let functions = getFunctions(device);

            let m = new functions(that, device.id);

            for (let k in m) {
                if (m.hasOwnProperty(k)) {
                    device[k] = m[k];
                }
            }
        }
        catch( e ){
            console.log('sandbox => ' + e.message);
        }

        return device;
    };

    this.findScene = function(area, name){
        let scene = automation.findScene(area, name);

        try {
            let functions = require('./functions/scene.js');

            let m = new functions(that, scene.id);

            for (let k in m) {
                if (m.hasOwnProperty(k)) {
                    scene[k] = m[k];
                }
            }
        }
        catch( e ){
            console.log('sandbox => ' + e.message);
        }

        return scene;
    };

    this.request = function(url, complete){
        try {
            if ( test ){
                if (complete !== undefined) {
                    complete(null, null, "test");
                }
                return;
            }
            automation.call(url, function (err, response, body) {
                if (complete !== undefined) {
                    complete(err, response, body);
                }
            });
        }
        catch(e){
            console.log('sandbox => ' + e.message);
        }
    }
}

module.exports = sandbox;
