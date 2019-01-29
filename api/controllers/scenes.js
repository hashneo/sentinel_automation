'use strict';

const uuid = require('uuid');

module.exports.getScenes = (req, res) => {
    let result = [];
    for (let area in global.module.scenes) {
        for (let name in global.module.scenes[area]) {
            let scene = global.module.scenes[area][name];

            let add = true;

            if ( scene.owner && req.jwt ){
                add = (scene.owner === req.jwt.acc_id)
            }

            if (add) {
                delete scene.code;
                result.push(scene);
            }
        }
    }
    res.status(200).json( {'result': 'ok', 'data': result});
};

module.exports.getSceneById = (req, res) => {

    let id = req.swagger.params.id.value;
    
    try {
        let data;

        for (let area in global.module.scenes) {
            for (let name in global.module.scenes[area]) {
                if (global.module.scenes[area][name].id === id) {
                    data = global.module.scenes[area][name];
                    break;
                }
            }
            if (data !== undefined) break;
        }

        if (data)
            res.status(200).json( data);
        else
            res.status(404).json( {});

    } catch (e) {
        res.status(500).json( {"error": e.message});
    }
};

module.exports.runSceneById = (req, res) => {

    let id = req.swagger.params.id.value;
    
    try {
        let result;
        let found = false;

        for (let area in global.module.scenes) {
            for (let name in global.module.scenes[area]) {
                if (global.module.scenes[area][name].id === id) {
                    result = global.module.runInSandbox(global.module.scenes[area][name], {}, false);
                    found = true;
                    break;
                }
            }
            if (found)
                break;
        }

        res.status(200).json( {'result': result});

    } catch (e) {
        res.status(500).json( {"error": e});
    }
};

module.exports.postScene = (req, res) => {

    let js = req.swagger.params.data.value;
    let test = req.swagger.params.test.value;

    if (!js.id)
        js.id = uuid.v4();

    let source =  req.cookies['connect.sid']; //req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    global.module.runInSandbox(js, {}, test, source)
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
