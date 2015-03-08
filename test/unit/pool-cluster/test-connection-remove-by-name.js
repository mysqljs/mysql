var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster({defaultSelector: 'ORDER'});
var server  = common.createFakeServer();

var connCount  = 0;
var poolConfig = common.getTestConfig({port: common.fakeServerPort});
cluster.add('SLAVE1', poolConfig);

server.listen(common.fakeServerPort, function(err) {
    assert.ifError(err);

    cluster.getConnection('SLAVE1', function (err, connection) {
        assert.ifError(err);
        assert.strictEqual(connection._clusterId, 'SLAVE1');

        cluster.remove('SLAVE1');

    });

    cluster.on('removeManually', function(nodeId){
        assert.strictEqual(nodeId, 'SLAVE1');
        cluster.getConnection('SLAVE1', function (err, connection) {
            assert.ok(err);
            assert.equal(err.message, 'Pool does not exist.');
        });
    });

});

setTimeout(function serverDestroy(){
    server.destroy();
}, 10000);