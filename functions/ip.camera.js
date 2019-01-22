module.exports = function (sandbox, id) {
    this.enable = function(){
        return sandbox.request('/camera/' + id + '/enable' );
    };

    this.disable = function(){
        return sandbox.request('/camera/' + id + '/disable' );
    };

    this.alarm = new function(){
        this.enable = function(type){
            return sandbox.request('/camera/' + id + '/detection/' + type +  '/enable' );
        };

        this.disable = function(type){
            return sandbox.request('/camera/' + id + '/detection/' + type +  '/disable' );
        };
    };
};
