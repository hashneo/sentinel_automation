'use strict';

module.exports.getScenes = (req, res) => {
    let result = [];
    for (let area in global.module.scenes) {
        for (let name in global.module.scenes[area]) {
            result.push({'id': global.module.scenes[area][name].id, 'area': area, 'name': global.module.scenes[area][name].name});
        }
    }
    res.json(200, {'result': 'ok', 'data': result});
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
            res.json(200, data);
        else
            res.json(404, {});

    } catch (e) {
        res.json(500, {"error": e.message});
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

        res.json(200, {'result': result});

    } catch (e) {
        res.json(500, {"error": e});
    }
};
