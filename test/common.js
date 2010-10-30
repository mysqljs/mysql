var path = require('path');
require.paths.unshift(path.dirname(__dirname)+'/lib');
var sys = require('mysql/sys');

var parent = module.parent.filename;
if (parent.match(/test\/system/) || parent.match(/benchmark/)) {
  try {
    global.TEST_CONFIG = require('./config');
  } catch (e) {
    console.log('Skipping. See test/config.template.js for more information.');
    process.exit(0);
  }
}

global.TEST_DB = 'node_mysql_test';
global.TEST_TABLE = 'posts';
global.TEST_FIXTURES = path.join(__dirname, 'fixture');

global.Gently = require('gently');
global.assert = require('assert');
global.p = function(val) {
  sys.error(sys.inspect(val));
};

global.GENTLY = new Gently();
global.HIJACKED = GENTLY.hijacked;
