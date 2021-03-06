'use strict';

const fs = require('fs');
const _ = require('lodash');
const util = require('util');

const redis = require('redis');

const logger = require('sentinel-common').logger;

function sandbox(automation, logStream){
    let that = this;

    this.require = require;

    this.console = new function () {
        this.log = function (...args) {
            let s = util.format(...args);
            if (logStream)
                logStream.write(`${s}\n`);
        }
    };

    this.process = new function() {
        this.on = function( e, f ){
            if ( e === 'unhandledRejection') {
                process.on(e, (reason, p) =>{
                    logger.error('Unhandled Rejection IN AUTOMATION at: Promise', p, 'reason:', reason);
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


    function getFunctions(deviceType){

        let codeFile = __dirname + '/functions/' + deviceType + '.js';

        let parts = deviceType.split('.');

        while ( !fs.existsSync(codeFile) ){
            parts.pop();

            // If there is no code associated with the
            // device type, return
            if ( parts.length === 0 ){
                logger.debug('sandbox getFunctions => ' + deviceType + ' does not have a function code file.');
                return [];
            }

            codeFile = __dirname + '/functions/' + parts.join('.') + '.js';
        }

        return require(codeFile);
    }

    function mixInFunctions(device, type){

        let functions = getFunctions(type);

        if ( functions && functions.length ) {
            let m = new functions(that, device.id);

            for (let k in m) {
                if (m.hasOwnProperty(k)) {
                    device[k] = m[k];
                }
            }
        }

    }

    this.findDeviceByType = (type) => {

        return new Promise( (fulfill, reject) => {

            automation.findDeviceByType(type)

                .then((devices) => {

                    let p = [];

                    devices.forEach((device) => {

                        try {
                            mixInFunctions(device, 'device');
                            mixInFunctions(device, device.type);

                            p.push( device.status() );
                        }
                        catch (e) {
                            logger.error('sandbox findDeviceByType => ' + e.message);
                        }

                    });


                    Promise.all(p)
                        .then( results => {
                            for (let i = 0; i < results.length; i++) {
                                devices[i]['current'] = results[i][0];
                            }
                            fulfill(devices);
                        })
                        .catch( (err) =>{
                            reject(err);
                        })

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
                        mixInFunctions(device, 'device');
                        mixInFunctions(device, device.type);
                    }
                    catch (e) {
                        logger.error('sandbox findDevice => ' + e.message);
                    }

                    if ( device ) {
                        automation.getDeviceStatus(device.id)
                            .then((status) => {
                                device.current = status;
                                fulfill(device);
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
            logger.error('sandbox findScene => ' + e.message);
        }

        return scene;
    };

    this.request = function(url) {

        return new Promise((fulfill, reject) => {

            try {
                automation.call(url)
                    .then((data) => {
                        fulfill(data);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            }
            catch (err) {
                logger.error('sandbox request => ' + err.message);
                reject(err);
            }
        });
    };

}

module.exports = sandbox;
