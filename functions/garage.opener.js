module.exports = function (sandbox, id) {

    var id = id;
    var sandbox = sandbox;
    var that = this;

    this.open = function(complete){
        sandbox.request('/door/' + id + '/open', complete );
    };

    this.close = function(complete){
        sandbox.request('/door/' + id + '/close', complete );
    };
};