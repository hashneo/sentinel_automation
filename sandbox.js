'use strict';

const fs = require('fs');
const _ = require('lodash');
const util = require('util');

const redis = require('redis');

let pub = redis.createClient(
    {
        host: process.env.REDIS || global.config.redis || '127.0.0.1' ,
        socket_keepalive: true,
        retry_unfulfilled_commands: true
    }
);

function sandbox(automation, test, sourceIp){
    let that = this;

    this.require = require;

    this.console = new function () {
        this.log = function (...args) {
            let s = util.format(...args);
            console.log( s );
            if (sourceIp) {
                let data = JSON.stringify({module: 'automation', target: sourceIp, log: s});
                pub.publish('sentinel.automation.log', data);
            }
        }
    };

    this.process = new function() {
        this.on = function( e, f ){

            if ( e === 'unhandledRejection') {
                process.on(e,  (reason, p) =>{

                    that.console.log('Unhandled Rejection IN AUTOMATION at: Promise', p, 'reason:', reason);

                    f( reason, p );
                });
            }
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
                console.log('sandbox getFunctions => ' + device.type + ' does not have a function code file.');
                return [];
            }

            codeFile = __dirname + '/functions/' + parts.join('.') + '.js';
        }

        return require(codeFile);
    }

    this.findDeviceByType = (type) => {

        return new Promise( (fulfill, reject) => {

            automation.findDeviceByType(type)

                .then((devices) => {

                    devices.forEach((device) => {

                        try {
                            let functions = getFunctions(device);

                            let m = new functions(that, device.id);

                            for (let k in m) {
                                if (m.hasOwnProperty(k)) {
                                    device[k] = m[k];
                                }
                            }
                        }
                        catch (e) {
                            console.log('sandbox findDeviceByType => ' + e.message);
                        }

                    });
                    fulfill(devices);
                })
                .catch( (err) =>{
                    reject(err);
                })
        })
    };

    this.findDevice = function(name){

        return new Promise( (fulfill, reject) => {

            automation.findDevice(name)
                .then ( (device) => {

                    try {
                        let functions = getFunctions(device);

                        let m = new functions(that, device.id);

                        for (let k in m) {
                            if (m.hasOwnProperty(k)) {
                                device[k] = m[k];
                            }
                        }
                    }
                    catch (e) {
                        console.log('sandbox findDevice => ' + e.message);
                    }

                    if ( device ) {
                        automation.getDeviceStatus(device.id)
                            .then((status) => {
                                device.current = status;
                            })
                            .catch((err) => {
                                reject(err);
                            })
                    }else {
                        fulfill(null);
                    }

                })
                .catch( (err) =>{
                    reject(err);
                })
        });
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
            console.log('sandbox findScene => ' + e.message);
        }

        return scene;
    };

    this.request = function(url) {

        return new Promise((fulfill, reject) => {

            try {
                if (test) {
                    fulfill();
                }
                automation.call(url)
                    .then((data) => {
                        fulfill(data);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            }
            catch (err) {
                console.log('sandbox request => ' + err.message);
                reject(err);
            }
        });
    }
}

module.exports = sandbox;
