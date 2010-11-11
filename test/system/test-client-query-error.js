require('../common');
var Client = require('mysql').Client,
    INVALID_QUERY_1 = 'first invalid #*&% query',
    INVALID_QUERY_2 = 'another #*&% wrong query';

(function testErrorCallback() {
  // The query callback should receive an error,
  // the client should not throw.

  var gently = new Gently(),
      client = new Client(TEST_CONFIG);

  client.connect(gently.expect(function connectCb(error) {
    if (error) throw error;
  }));

  client.query(INVALID_QUERY_1, [], gently.expect(function queryCb(error) {
    assert.ok(error);
    assert.strictEqual(error.sql, INVALID_QUERY_1);
    client.end();
    gently.verify('testErrorCallback');
  }));
})();

(function testQueryError() {
  // The query 'error' handler should be called,
  // the client should not throw.

  var gently = new Gently(),
      client = new Client(TEST_CONFIG),
      query;

  client.connect(gently.expect(function connectCb(error) {
    if (error) throw error;
  }));

  query = client.query(INVALID_QUERY_2);

  query.on('error', gently.expect(function errCb(error) {
    assert.ok(error);
    assert.strictEqual(error.sql, INVALID_QUERY_2);
    client.end();
    gently.verify('testQueryError');
  }));
})();

(function testClientError() {
  // The query should not throw,
  // the client's error handler should be called.

  var gently = new Gently(),
      client = new Client(TEST_CONFIG),
      query;

  client.connect(gently.expect(function connectCb(error) {
    if (error) throw error;
  }));

  query = client.query(INVALID_QUERY_1);

  client.on('error', gently.expect(function errCb(error) {
    assert.ok(error);
    assert.strictEqual(error.sql, INVALID_QUERY_1);
    client.end();
    gently.verify('testClientError');
  }));
})();

(function testRemoveListener() {
  // The query's error handler should not be called and the query must not throw,
  // the client's error handler should be called.

  var gently = new Gently(),
      client = new Client(TEST_CONFIG),
      query,
      dummyHandler = function() {
        throw new Error('The dummy handler should not be called');
      };

  client.connect(gently.expect(function connectCb(error) {
    if (error) throw error;
  }));

  query = client.query(INVALID_QUERY_2);

  query.on('error', dummyHandler);
  query.removeListener('error', dummyHandler);

  client.on('error', gently.expect(function errCb(error) {
    assert.ok(error);
    assert.strictEqual(error.sql, INVALID_QUERY_2);
    client.end();
    gently.verify('testRemoveListener');
  }));
})();

(function testSerialError() {
  // Query errors should not leave the client in a broken state,
  // subsequent (correct) queries should work fine.

  var gently = new Gently(),
      client = new Client(TEST_CONFIG);

  client.connect(gently.expect(function connectCb(error) {
    if (error) throw error;
  }));

  client.query(INVALID_QUERY_1, [], gently.expect(function queryCb(error) {
    assert.ok(error);
    assert.strictEqual(error.sql, INVALID_QUERY_1);
  }));

  client.query('SHOW STATUS', [], gently.expect(function queryCb(error, rows, fields) {
    assert.ifError(error);
    assert.equal(rows.length >= 50, true);
    assert.equal(Object.keys(fields).length, 2);
  }));

  client.query(INVALID_QUERY_1, [], gently.expect(function queryCb(error) {
    assert.ok(error);
    assert.strictEqual(error.sql, INVALID_QUERY_1);
  }));

  client.query(INVALID_QUERY_2, [], gently.expect(function errCb(error) {
    assert.ok(error);
    assert.strictEqual(error.sql, INVALID_QUERY_2);
    client.end();
    gently.verify('testSerialError');
  }));
})();