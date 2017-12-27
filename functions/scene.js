module.exports = function (sandbox, id) {

    var id = id;
    var sandbox = sandbox;
    var that = this;

    this.run = function(complete){
        sandbox.request('/automation/scenes/' + id + '/run', complete );
    };

};