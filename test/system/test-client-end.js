require('../common');
var Client = require('mysql').Client;

(function testImmediateEnd() {
  var gently = new Gently(),
      client = new Client(TEST_CONFIG);

  client.connect(gently.expect(function connectCb(err, result) {
    assert.ifError(err);
  }));

  client.end(gently.expect(function endCb() {
    gently.verify('testImmediateEnd');
  }));

  // If client.end is not correctly run *after* connect has finished,
  // the connection is never closed, and this test will run forever.
})();

(function testEndAfterQuery() {
  var gently = new Gently(),
      client = new Client(TEST_CONFIG);

  client.connect(gently.expect(function connectCb(err, result) {
    assert.ifError(err);
  }));

  client.query('SHOW STATUS', [], gently.expect(function queryCb(error, rows, fields) {
    assert.ifError(error);
    assert.equal(rows.length >= 50, true);
    assert.equal(Object.keys(fields).length, 2);
  }));

  client.end(gently.expect(function endCb() {
    gently.verify('testEndAfterQuery');
  }));

  // If client.end is not run *after* query is done, either the
  // connection is never closed or the query throws a 'Stream not writable' error.
})();
