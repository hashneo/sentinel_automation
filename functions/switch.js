module.exports = function (sandbox, id) {

    var id = id;
    var sandbox = sandbox;
    var that = this;

    this.current = function(){
        var value = undefined;
        sandbox.request('/device/' + id + '/status', function(err, response, body){
            var data =JSON.parse(body);
            value = parseInt(data.data[0].SwitchPower.Current);
        },
        function(){
            value = null;
        });
        require('deasync').loopWhile(function(){return value === undefined;});
        return value;
    };

    this.on = function(complete){
        sandbox.request('/light/' + id + '/on', complete );
    };

    this.off = function(complete){
        sandbox.request('/light/' + id + '/off', complete );
    };
};