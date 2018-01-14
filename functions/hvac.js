module.exports = function (sandbox, id) {
    this.mode = new function () {
        this.heat = function () {
            return sandbox.request('/hvac/' + id + '/heat');
        };

        this.cool = function () {
            return sandbox.request('/hvac/' + id + '/cool');
        };

        this.auto = function () {
            return sandbox.request('/hvac/' + id + '/auto');
        };

        this.home = function () {
            return sandbox.request('/hvac/' + id + '/home');
        };

        this.away = function () {
            return sandbox.request('/hvac/' + id + '/away');
        };
    };

    this.set = new function () {
        this.heat = function (temp) {
            return sandbox.request('/hvac/' + id + '/heat/' + temp);
        };

        this.cool = function (temp) {
            return sandbox.request('/hvac/' + id + '/cool/' + temp);
        };
    };
};
