module.exports = function (sandbox, id) {
    this.mode = new function () {
        this.heating = function () {
            return sandbox.request('/hvac/' + id + '/heat');
        };

        this.cooling = function () {
            return sandbox.request('/hvac/' + id + '/cool');
        };

        this.auto = function () {
            return sandbox.request('/hvac/' + id + '/auto');
        };

        this.off = function () {
            return sandbox.request('/hvac/' + id + '/off');
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
            return sandbox.request('/hvac/' + id + '/heat/set/' + temp);
        };

        this.cool = function (temp) {
            return sandbox.request('/hvac/' + id + '/cool/set/' + temp);
        };
    };
};
