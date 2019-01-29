module.exports = function (sandbox, id) {
    this.send = function(command){
        return sandbox.request('/ir/' + id + '/send?command=' + command);
    };
};
