var common     = require('../common');
var Pool       = require('../../lib/Pool');
var pool = new Pool(null,{
  poolSize: 10,
  createConnection: common.createConnection.bind(undefined,{
    typeCast: false
  })
});
var assert     = require('assert');


var rows = undefined;
var query = pool.query("SELECT NOW() as date", function(err, _rows) {
  if (err) throw err;

  rows = _rows;
  pool.end();
});

process.on('exit', function() {
  assert.strictEqual(typeof rows[0].date, 'string');
});
