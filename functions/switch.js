module.exports = function (sandbox, id) {
    /*
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
    */

    this.on = function(){
        return sandbox.request('/light/' + id + '/on' );
    };

    this.off = function(){
        return sandbox.request('/light/' + id + '/off' );
    };
};