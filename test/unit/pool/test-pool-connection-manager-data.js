var assert     = require('assert');
var common     = require('../../common');
var test       = require('utest');

var PoolConnectionManagerData = require(common.lib + '/PoolConnectionManagerData');

var DummyConnection = function(id, value) {
  this.id = id;
  this.value = value;
};

DummyConnection.prototype.getId = function() {
  return this.id;
};

test('PoolConfig#AllConnection', {
  'works with basic operations': function() {
    var allConnection = new PoolConnectionManagerData.AllConnection();

    allConnection.add(new DummyConnection(1, 'a'));
    allConnection.add(new DummyConnection(2, 'b'));
    allConnection.add(new DummyConnection(3, 'c'));

    assert.equal(allConnection.size(), 3);
    assert.equal(allConnection.get(2).value, 'b');

    allConnection.remove(new DummyConnection(2));
    assert.equal(allConnection.size(), 2);
    assert.equal(allConnection.get(2), null);

    var ids = [];
    allConnection.destroy(function(connection) {
      ids.push(connection.getId());
    });

    assert.deepEqual(ids, [1, 3]);
    assert.ok(allConnection.isEmpty());
  }
});

test('PoolConfig#IdleConnection', {
  'works with basic operations': function() {
    var idleConnection = new PoolConnectionManagerData.IdleConnection();
    idleConnection.add(new DummyConnection(1));
    idleConnection.add(new DummyConnection(2));

    // stack : 1, 2
    assert.equal(idleConnection.size(), 2);

    // stack : 1
    assert.equal(idleConnection.pop(), 2);

    // stack : 1, 3, 4
    idleConnection.add(new DummyConnection(3));
    idleConnection.add(new DummyConnection(4));

    var twoItems = idleConnection.lookup(2);
    assert.deepEqual(twoItems, [1, 3]);

    // stack : 1, 4
    idleConnection.remove(new DummyConnection(3));

    assert.equal(idleConnection.size(), 2);
    assert.equal(idleConnection.pop(), 4);
    assert.equal(idleConnection.pop(), 1);
    assert.equal(idleConnection.pop(), null);
    assert.ok(idleConnection.isEmpty());
  }
});

test('PoolConfig#CallbackQueue', {
  'works with basic operations': function() {
    var callbackQueue = new PoolConnectionManagerData.CallbackQueue();

    function dummyCallback(connection) {
      connection();
    }

    function dummyCallback2(connection) {
      connection();
    }

    // add
    callbackQueue.add(dummyCallback);
    callbackQueue.add(dummyCallback2);

    assert.equal(callbackQueue.size(), 2);

    // pop
    var callback = callbackQueue.pop();
    assert.equal(callback, dummyCallback);
    assert.equal(callbackQueue.size(), 1);

    // rollback
    callbackQueue.rollback(callback);
    assert.equal(callbackQueue.size(), 2);
    assert.deepEqual(callbackQueue._queue[0].callback, dummyCallback);

    // destory
    var callbacks = [];
    callbackQueue.destroy(function(callback) {
      callbacks.push(callback);
    });

    assert.deepEqual(callbacks, [dummyCallback, dummyCallback2]);
    assert.ok(callbackQueue.isEmpty());
  }
});
