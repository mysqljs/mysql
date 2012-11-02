var ConnectionConfig = require('../../../lib/ConnectionConfig');
var ClientConstants  = require('../../../lib/protocol/constants/client');
var assert           = require('assert');

var testFlags = [{
  'default' : [ '' ],
  'user'    : 'LONG_PASSWORD',
  'expected': ClientConstants.CLIENT_LONG_PASSWORD
}, {
  'default' : [ '' ],
  'user'    : '-LONG_PASSWORD',
  'expected': 0x0
}, {
  'default' : [ 'LONG_PASSWORD', 'FOUND_ROWS' ],
  'user'    : '-LONG_PASSWORD',
  'expected': ClientConstants.CLIENT_FOUND_ROWS
}, {
  'default' : [ 'LONG_PASSWORD', 'FOUND_ROWS' ],
  'user'    : '-FOUND_ROWS',
  'expected': ClientConstants.CLIENT_LONG_PASSWORD
}, {
  'default' : [ 'LONG_PASSWORD', 'FOUND_ROWS' ],
  'user'    : '-LONG_FLAG',
  'expected': ClientConstants.CLIENT_LONG_PASSWORD |
              ClientConstants.CLIENT_FOUND_ROWS
}, {
  'default' : [ 'LONG_PASSWORD', 'FOUND_ROWS' ],
  'user'    : 'LONG_FLAG',
  'expected': ClientConstants.CLIENT_LONG_PASSWORD |
              ClientConstants.CLIENT_FOUND_ROWS |
              ClientConstants.CLIENT_LONG_FLAG
}, {
  'default' : [ 'LONG_PASSWORD', 'FOUND_ROWS' ],
  'user'    : 'UNDEFINED_CONSTANT',
  'expected': ClientConstants.CLIENT_LONG_PASSWORD |
              ClientConstants.CLIENT_FOUND_ROWS
}, {
  'default' : [ 'LONG_PASSWORD', 'FOUND_ROWS' ],
  'user'    : '-UNDEFINED_CONSTANT',
  'expected': ClientConstants.CLIENT_LONG_PASSWORD |
              ClientConstants.CLIENT_FOUND_ROWS
}, {
  'default' : [ 'LONG_PASSWORD', 'FOUND_ROWS' ],
  'user'    : '-UNDEFINED_CONSTANT,,  -found_ROWS',
  'expected': ClientConstants.CLIENT_LONG_PASSWORD
}];

for (var i = 0; i < testFlags.length; i++) {
  // console.log("expected: %s got: %s", testFlags[i]['expected'],
  //             ConnectionConfig.mergeFlags(testFlags[i]['default'], testFlags[i]['user']));
  assert.strictEqual(testFlags[i]['expected'],
                     ConnectionConfig.mergeFlags(testFlags[i]['default'], testFlags[i]['user']));
}
