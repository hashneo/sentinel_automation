'use strict';

module.exports.getByDeviceId = (req, res) => {
    try {
        if ( !global.module.devices[req.params.id] ){
            return res.json(200,  {'result': 'ok', 'data': []});
        }

        let automation = [];
        for( let k in global.module.devices[req.params.id] ){
            automation.push(global.module.devices[req.params.id][k]);
        }

        res.json(200,  {'result': 'ok', 'data': automation });
    } catch (e) {
        res.json(500, {"error": e.message});
    }
};

module.exports.postByDeviceId = (req, res) => {
    try {
        let js = req.body;

        devices.findOne({'id': req.params.id}, function (err, device) {

            statusCache.get(req.params.id, function (err, value) {
                try {
                    let result = global.module.runInSandbox(js, value, true);

                    devices[device.id] = js;

                    res.json(200, {'result': result});

                }
                catch (e) {
                    res.json(500, {"error": e.message});
                }
            });
        });
    } catch (e) {
        res.json(500, {"error": e.message});
    }
};
