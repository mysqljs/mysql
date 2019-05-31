var assert = require('assert');
var common = require('../../common');

common.getTestConnection({ flags: ['-PLUGIN_AUTH'] }, function (err) {
  assert.ok(err, 'got error');
});
