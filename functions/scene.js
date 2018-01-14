module.exports = function (sandbox, id) {
    this.run = function(){
        return sandbox.request('/automation/scenes/' + id + '/run' );
    };
};