module.exports = function (sandbox, id) {

    var id = id;
    var sandbox = sandbox;
    var that = this;

    this.mode = new function () {

        this.auto = function (type, complete) {
            sandbox.request('/heater/' + id + '/auto', complete);
        };

        this.home = function (type, complete) {
            sandbox.request('/heater/' + id + '/home', complete);
        };

        this.away = function (type, complete) {
            sandbox.request('/heater/' + id + '/away', complete);
        };
    };


    this.set = function (temp, complete) {
        sandbox.request('/heater/' + id + '/' + temp, complete);
    };
};
