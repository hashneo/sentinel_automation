module.exports = function (sandbox, id) {
    this.open = function(){
        return sandbox.request('/door/' + id + '/open' );
    };

    this.close = function(complete){
        return sandbox.request('/door/' + id + '/close' );
    };
};