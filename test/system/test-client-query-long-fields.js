require('../common');
var client = require('mysql').Client(TEST_CONFIG),
    gently = new Gently();

client.connect();

function makeString(length) {
  var str = '';
  for (var i = 0; i < length; i++) {
    str += 'x';
  }
  return str;
}

var field_a = makeString(250),
    field_b = makeString(251),
    field_c = makeString(512),
    field_d = makeString(65537);

function test(last) {
  var query = client.query(
    'SELECT ? as field_a, ? as field_b, ? as field_c, ? as field_d',
    [field_a, field_b, field_c, field_d],
    function(err, results) {
    if (err) throw err;

    assert.equal(results[0].field_a, field_a);
    assert.equal(results[0].field_b, field_b);
    assert.equal(results[0].field_c, field_c);
    assert.equal(results[0].field_d, field_d);
    if (last) {
      client.end();
    }
  });
}

// We execute this test twice to be sure the parser is in a good state after
// each run.
test();
test(true);
