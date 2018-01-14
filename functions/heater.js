module.exports = function (sandbox, id) {
    this.mode = new function () {
        this.auto = function () {
            return sandbox.request('/heater/' + id + '/auto');
        };

        this.home = function () {
            return sandbox.request('/heater/' + id + '/home');
        };

        this.away = function () {
            return sandbox.request('/heater/' + id + '/away');
        };
    };

    this.set = function (temp) {
        return sandbox.request('/heater/' + id + '/' + temp);
    };
};
