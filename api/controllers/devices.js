'use strict';

module.exports.getByDeviceId = (req, res) => {
    let id = req.swagger.params.id.value;

    try {
        if ( global.module.devices[id] === undefined ){
            return res.json(200,  {'result': 'ok', 'data': []});
        }

        let automation = [];
        for( let k in global.module.devices[id] ){
            automation.push(global.module.devices[id][k]);
        }

        res.json(200,  {'result': 'ok', 'data': automation });
    } catch (e) {
        res.json(500, {"error": e.message});
    }
};

module.exports.postByDeviceId = (req, res) => {

    let id = req.swagger.params.id.value;
    
    try {
        let js = req.body;

        devices.findOne({'id': id}, function (err, device) {

            statusCache.get(id, function (err, value) {
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
