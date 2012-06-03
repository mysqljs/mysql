var common     = require('../common');
var Pool       = require('../../lib/Pool');
var pool = new Pool(null,{
  poolSize: 10,
  createConnection: common.createConnection
});
var assert     = require('assert');


var rows = undefined;
pool.query('SELECT 1', function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

setTimeout(function(){
  pool.end();
},2000);

process.on('exit', function() {
  assert.deepEqual(rows, [{1: 1}]);
});
