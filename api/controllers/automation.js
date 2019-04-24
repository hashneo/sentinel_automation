'use strict';

const uuid = require('uuid');

module.exports.getAutomations = (req, res) => {
    try {
        global.module.devices.find().toArray(function (err, sys) {
            if (err === null) {
                let result = [];
                res.status(200).json({'result': 'ok', 'data': result});
            } else {
                throw err;
            }
        });
    } catch (err) {
        res.status(err.code >= 400 && err.code <= 451 ? err.code : 500).json( { code: err.code || 0, message: err.message } );
    }
};

module.exports.postAutomation = (req, res) => {

    let js = req.swagger.params.data.value;
    let test = req.swagger.params.test.value;

    if (!js.id)
        js.id = uuid.v4();

    global.module.getDeviceStatus(js.device)
        .then( (status) =>{
            return global.module.runInSandbox(js, status || {}, test);
        })
        .then( (result) => {

            return new Promise((fulfill, reject) => {

                if (test) {
                    return fulfill(result)
                }
                global.module.saveAutomation(js)
                    .then(() => {
                        fulfill(result);
                    })
                    .catch((err) => {
                        reject(err);
                    })
            })
        })
        .then( (result) => {
            res.status(200).json( {'id': js.id, 'result': result} );
        })
        .catch( (err) => {
            res.status(err.code >= 400 && err.code <= 451 ? err.code : 500).json({
                code: err.code || 0,
                message: err.message
            });
        });

};
