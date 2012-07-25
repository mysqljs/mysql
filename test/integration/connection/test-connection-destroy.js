var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

connection.connect(function(err) {
  if (err) throw err;

  connection.destroy();
});
