var assert = require('assert');
var common = require('../../common');

common.getTestConnection({ flags: ['+PLUGIN_AUTH'] }, function (err, connection) {
  assert.ifError(err, 'got error');
  connection.destroy();
});