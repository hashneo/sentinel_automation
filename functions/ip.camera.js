module.exports = function (sandbox, id) {
    this.alarm = new function(){
        this.enable = function(type){
            return sandbox.request('/camera/' + id + '/detection/' + type +  '/enable' );
        };

        this.disable = function(type){
            return sandbox.request('/camera/' + id + '/detection/' + type +  '/disable' );
        };
    };
};
