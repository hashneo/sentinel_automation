'use strict';

const uuid = require('uuid');

module.exports.getAutomations = (req, res) => {
    try {
        global.module.devices.find().toArray(function (err, sys) {
            if (err === null) {
                var result = [];
                for (var d in sys) {

                }
                res.status(200).json({'result': 'ok', 'data': result});
            } else {
                throw err;
            }
        });
    } catch (e) {
        res.json(500, {"error": e});
    }
};

function saveAutomation(js) {

    return new Promise( (fulfill, reject) => {

        let subKey =  js.type + '/';

        let path = config.path() + subKey;

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

module.exports.postAutomation = (req, res) => {
    try {
        let js = req.body;

        if (!js.id)
            js.id = uuid.v4();

        let status = server.getDeviceStatus(js.device);

        let result = that.runInSandbox(js, status || {}, true);

        if (js.test){
            res.json(200, {'result': result});
            return;
        }

        delete js.test;

        //let subKey =  js.type + '/device/' + js.device + '/events/';

        saveAutomation(js)
            .then( () =>{
                res.json(200, {'id': js.id, 'result': result});
            })
            .catch( (e) => {
                throw e;
            })

    } catch (e) {
        res.json(500, {"error": e.message});
    }
};
