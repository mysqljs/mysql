var path = require('path')
  , sys = require('sys');

require.paths.unshift(path.dirname(__dirname)+'/lib');

global.Gently = require('gently');
global.assert = require('assert');
global.p = function(val) {
  sys.error(sys.inspect(val));
};

global.GENTLY = new Gently();
global.HIJACKED = GENTLY.hijacked;