module.exports = function (sandbox, id) {
    this.status = function () {
        return sandbox.request('/device/' + id + '/status');
    };

};
