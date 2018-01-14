module.exports = function (sandbox, id) {
    this.lock = function(){
        return sandbox.request('/lock/' + id + '/closed' );
    };

    this.unlock = function(){
        return sandbox.request('/lock/' + id + '/open' );
    };
};