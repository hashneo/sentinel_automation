module.exports = function (sandbox, id) {

    var id = id;
    var sandbox = sandbox;
    var that = this;

    this.mode = new function () {
        this.heat = function (type, complete) {
            sandbox.request('/hvac/' + id + '/heat', complete);
        };

        this.cool = function (type, complete) {
            sandbox.request('/hvac/' + id + '/cool', complete);
        };

        this.auto = function (type, complete) {
            sandbox.request('/hvac/' + id + '/auto', complete);
        };

        this.home = function (type, complete) {
            sandbox.request('/hvac/' + id + '/home', complete);
        };

        this.away = function (type, complete) {
            sandbox.request('/hvac/' + id + '/away', complete);
        };
    };

    this.set = new function () {
        this.heat = function (temp, complete) {
            sandbox.request('/hvac/' + id + '/heat/' + temp, complete);
        };

        this.cool = function (temp, complete) {
            sandbox.request('/hvac/' + id + '/cool/' + temp, complete);
        };
    };
};
