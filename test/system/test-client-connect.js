require('../common');
var client = require('mysql').Client(TEST_CONFIG),
    gently = new Gently();

client.connect(gently.expect(function connectCb(err, result) {
  if (err) throw err;

  assert.strictEqual(result.affectedRows, 0);
  client.end();
}));
