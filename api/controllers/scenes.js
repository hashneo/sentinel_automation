'use strict';

module.exports.getScenes = (req, res) => {
    let result = [];
    for (let area in global.module.scenes) {
        for (let name in global.module.scenes[area]) {
            result.push({'id': global.module.scenes[area][name].id, 'area': area, 'name': global.module.scenes[area][name].name});
        }
    }
    res.status(200).json( {'result': 'ok', 'data': result});
};

module.exports.getSceneById = (req, res) => {

    try {
        let data;

        for (let area in global.module.scenes) {
            for (let name in global.module.scenes[area]) {
                if (global.module.scenes[area][name].id === req.params.id) {
                    let file = path.join(__dirname, 'automation', 'scenes', req.params.id + '.json');
                    data = fs.readFileSync(file, {'encoding': 'utf-8'});
                    data = JSON.parse(data);
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

    try {
        let result;
        let found = false;

        for (let area in global.module.scenes) {
            for (let name in global.module.scenes[area]) {
                if (global.module.scenes[area][name].id === req.params.id) {
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
