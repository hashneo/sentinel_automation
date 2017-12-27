module.exports = function (sandbox, id) {

    var id = id;
    var sandbox = sandbox;
    var that = this;

    this.lock = function(complete){
        sandbox.request('/lock/' + id + '/closed', complete );
    };

    this.unlock = function(complete){
        sandbox.request('/lock/' + id + '/open', complete );
    };
};