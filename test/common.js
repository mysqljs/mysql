var path = require('path')
  , sys = require('sys');

require.paths.unshift(path.dirname(__dirname)+'/lib');

global.TEST_CONFIG =
  { host: 'localhost'
  , port: 3306
  , user: 'root'
  , password: 'root'
  , database: 'node_mysql_test'
  };

global.Gently = require('gently');
global.assert = require('assert');
global.p = function(val) {
  sys.error(sys.inspect(val));
};

global.GENTLY = new Gently();
global.HIJACKED = GENTLY.hijacked;