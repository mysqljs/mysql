var common = require('../common');
var assert = require('assert');
var test = common.fastOrSlow.slow();
var mysql = require(common.dir.lib + '/mysql');

var INVALID_QUERY_1 = 'first invalid #*&% query';
var INVALID_QUERY_2 = 'another #*&% wrong query';

test.before(function() {
  this.client = common.createClient();
});

test.after(function(done) {
  this.client.end(done);
});

test('query callback should receive error', function(done) {
  this.client.query(INVALID_QUERY_1, function(error) {
    assert.ok(error);
    assert.strictEqual(error.sql, INVALID_QUERY_1);
    done();
  });
});

test('query object should emit error event', function(done) {
  var query = this.client.query(INVALID_QUERY_2);

  query.on('error', function(error) {
    assert.ok(error);
    assert.strictEqual(error.sql, INVALID_QUERY_2);
    done();
  });
});

test('query errors are delegated to client error event if needed', function(done) {
  var query = this.client.query(INVALID_QUERY_1);

  this.client.on('error', function(error) {
    assert.ok(error);
    assert.strictEqual(error.sql, INVALID_QUERY_1);
    done();
  });
});

test('query errors should not leave client in a broken state', function(done) {
  this.client.query(INVALID_QUERY_1, function(error) {
    assert.ok(error);
    assert.strictEqual(error.sql, INVALID_QUERY_1);
  });

  this.client.query('SHOW STATUS', function(error, rows, fields) {
    assert.ifError(error);
    assert.equal(rows.length >= 50, true);
    assert.equal(Object.keys(fields).length, 2);
  });

  this.client.query(INVALID_QUERY_1, function(error) {
    assert.ok(error);
    assert.strictEqual(error.sql, INVALID_QUERY_1);
  });

  this.client.query(INVALID_QUERY_2, function(error) {
    assert.ok(error);
    assert.strictEqual(error.sql, INVALID_QUERY_2);
    done();
  });
});
