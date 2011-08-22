var common = require('../common');
var assert = require('assert');
var test = common.fastOrSlow.slow();

test.before(function() {
  this.client = common.createClient();
});

test.after(function(done) {
  var connected = this.client.connected;
  this.client.end(function(err) {
    (connected)
      ? assert.equal(err, null)
      : assert.notEqual(err, null);

    done();
  });
});

test('Client tries to connect automatically', function(done) {
  this.client.query('SELECT 1', function(err, results) {
    assert.deepEqual(results, [{1: 1}]);
    done(err);
  });
});

test('Connection errors are delegated to callback', function(done) {
  // Port number outside of range -> triggers connection error
  this.client.port = 999999999;

  var callbacks = [];
  this.client.query('SELECT 1', function(err) {
    assert.ok(err);
    callbacks.push(1);
  });

  this.client.query('SELECT 2', function(err) {
    callbacks.push(2);
    assert.ok(err);

    assert.deepEqual(callbacks, [1, 2]);
    done(null);
  });
});

test('Bad credentials', function(done) {
  this.client.password = 'thispassworddoesnotreallywork';

  var callbacks = [];
  this.client.query('SELECT 1', function(err) {
    assert.ok(err);
    callbacks.push(1);
  });

  this.client.query('SELECT 2', function(err) {
    assert.ok(err);
    callbacks.push(2);

    assert.deepEqual(callbacks, [1, 2]);
    done();
  });
});

test('Reconnecting a closed client works', function(done) {
  var cbs = [];
  this.client.query('SELECT 1', function() {
    cbs.push(1);
  });

  this.client.end(function() {
    cbs.push(2);
  });

  this.client.query('SELECT 1', function(err) {
    assert.deepEqual(cbs, [1, 2]);
    done(err);
  });
});

test('Reconnect on timeout', {timeout: 2000}, function(done) {
  // Not sure if we need all 3 of these, but they do the trick
  this.client.query('SET interactive_timeout = 1');
  this.client.query('SET wait_timeout = 1');
  this.client.query('SET net_read_timeout = 1');

  var self = this;
  this.client._socket.on('end', function() {
    assert.equal(self.client.connected, false);

    self.client.query('SELECT 1', function(err) {
      done(err);
    });
  });
});
