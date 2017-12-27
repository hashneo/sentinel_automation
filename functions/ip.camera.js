module.exports = function (sandbox, id) {

    var id = id;
    var sandbox = sandbox;
    var that = this;

    this.alarm = new function(){
        this.enable = function(type, complete){
            sandbox.request('/camera/' + id + '/detection/' + type +  '/enable', complete );
        };

        this.disable = function(type, complete){
            sandbox.request('/camera/' + id + '/detection/' + type +  '/disable', complete );
        };
    };
};
