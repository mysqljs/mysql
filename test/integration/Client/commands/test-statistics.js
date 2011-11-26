var common = require('../../../common');
var assert = require('assert');

var client = common.createClient();
client.statistics(function(err, result) {
  if (err) throw err;

  assert.ok(result.extra.match(/time/i));
  client.end();
});
