var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster({defaultSelector: 'ORDER'});
var server  = common.createFakeServer();

var connCount  = 0;
var poolConfig = common.getTestConfig({port: common.fakeServerPort});
cluster.add('SLAVE1', poolConfig);
cluster.add('SLAVE2', poolConfig);

server.listen(common.fakeServerPort, function(err) {
    assert.ifError(err);

    // added nodes
    assert.deepEqual(cluster._serviceableNodeIds, ['SLAVE1', 'SLAVE2']);

    // Test SLAVE1
    cluster.getConnection('SLAVE1', function (err, connection) {
        assert.strictEqual(connection._clusterId, 'SLAVE1');
        cluster.remove('SLAVE1');
    });

    // Test SLAVE2
    cluster.getConnection('SLAVE2', function (err, connection) {
        assert.strictEqual(connection._clusterId, 'SLAVE2');
        cluster.remove('SLAVE2');
    });

    cluster.on('removeManually', function(nodeId){
        cluster.getConnection(nodeId, function (err, connection) {
            assert.ok(err);
            assert.strictEqual(err.message, 'Pool does not exist.');
        });
    });

});

setTimeout(function serverDestroy(){
    server.destroy();
}, 2000);
