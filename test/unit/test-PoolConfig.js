var assert     = require('assert');
var common     = require('../common');
var test       = require('utest');
var Charsets   = require(common.lib + '/protocol/constants/charsets');
var PoolConfig = require(common.lib + '/PoolConfig');

test('PoolConfig#Constructor', {
  'works with combined object': function() {
    var config = new PoolConfig({
      connectionLimit : 2,
      host            : 'remote',
      port            : 3333
    });

    assert.ok(config.connectionConfig);
    assert.equal(config.connectionConfig.host, 'remote');
    assert.equal(config.connectionConfig.port, 3333);
    assert.equal(config.connectionLimit, 2);
  },

  'works with connection string': function() {
    var url    = 'mysql://myhost:3333/mydb?debug=true&charset=BIG5_CHINESE_CI';
    var config = new PoolConfig(url);

    assert.ok(config.connectionConfig);
    assert.equal(config.connectionConfig.host, 'myhost');
    assert.equal(config.connectionConfig.port, 3333);
    assert.equal(config.connectionConfig.database, 'mydb');
    assert.equal(config.connectionConfig.debug, true);
    assert.equal(config.connectionConfig.charsetNumber, Charsets.BIG5_CHINESE_CI);
  },

  'connection string can configure pool': function() {
    var url    = 'mysql://myhost:3333/mydb?connectionLimit=2';
    var config = new PoolConfig(url);

    assert.ok(config.connectionConfig);
    assert.equal(config.connectionConfig.host, 'myhost');
    assert.equal(config.connectionConfig.port, 3333);
    assert.equal(config.connectionConfig.database, 'mydb');
    assert.equal(config.connectionLimit, 2);
  },
});
