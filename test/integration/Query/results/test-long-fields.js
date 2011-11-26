var common = require('../../../common');
var assert = require('assert');

var client    = common.createClient();
var field_a   = makeString(250);
var field_b   = makeString(251);
var field_c   = makeString(512);
var field_d   = makeString(65537);
var callbacks = 0;

// We execute this test twice to be sure the parser is in a good state after
// each run.
test();
test(true);

function test(last) {
  var sql    = 'SELECT ? as field_a, ? as field_b, ? as field_c, ? as field_d';
  var params = [field_a, field_b, field_c, field_d];

  var query = client.query(sql, params, function(err, results) {
    if (err) throw err;

    assert.equal(results[0].field_a, field_a);
    assert.equal(results[0].field_b, field_b);
    assert.equal(results[0].field_c, field_c);
    assert.equal(results[0].field_d, field_d);

    callbacks++;
    if (last) client.destroy();
  });
}

function makeString(length) {
  var str = '';
  for (var i = 0; i < length; i++) {
    str += 'x';
  }
  return str;

}
process.on('exit', function() {
  assert.equal(callbacks, 2);
});
