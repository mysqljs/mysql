var path = require('path');
require.paths.unshift(path.dirname(__dirname)+'/lib');
var sys = require('mysql/sys');

global.TEST_DB = 'node_mysql_test';
global.TEST_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'root'
};

global.TEST_TABLE = 'posts';
global.TEST_FIXTURES = path.join(__dirname, 'fixture');

global.Gently = require('gently');
global.assert = require('assert');
global.p = function(val) {
  sys.error(sys.inspect(val));
};

global.GENTLY = new Gently();
global.HIJACKED = GENTLY.hijacked;
