var common = exports;
var fs     = require('fs');
var path   = require('path');

common.lib      = path.resolve(__dirname, '..', 'lib');
common.fixtures = path.resolve(__dirname, 'fixtures');

// Useful for triggering ECONNREFUSED errors on connect()
common.bogusPort     = 47378;
// Useful for triggering ER_ACCESS_DENIED_ERROR errors on connect()
common.bogusPassword = 'INVALID PASSWORD';

// Used for simulating a fake mysql server
common.fakeServerPort = 32893;
// Used for simulating a fake mysql server
common.fakeServerSocket = __dirname + '/fake_server.sock';

common.testDatabase = process.env.MYSQL_DATABASE || 'test';

// Export common modules
common.Auth             = require(common.lib + '/protocol/Auth');
common.Charsets         = require(common.lib + '/protocol/constants/charsets');
common.ClientConstants  = require(common.lib + '/protocol/constants/client');
common.Connection       = require(common.lib + '/Connection');
common.ConnectionConfig = require(common.lib + '/ConnectionConfig');
common.Errors           = require(common.lib + '/protocol/constants/errors');
common.Packets          = require(common.lib + '/protocol/packets');
common.PacketWriter     = require(common.lib + '/protocol/PacketWriter');
common.Parser           = require(common.lib + '/protocol/Parser');
common.PoolConfig       = require(common.lib + '/PoolConfig');
common.PoolConnection   = require(common.lib + '/PoolConnection');
common.SqlString        = require(common.lib + '/protocol/SqlString');
common.Types            = require(common.lib + '/protocol/constants/types');

var Mysql      = require(path.resolve(common.lib, '../index'));
var FakeServer = require('./FakeServer');

common.createConnection = function(config) {
  config = mergeTestConfig(config);
  return Mysql.createConnection(config);
};

common.createQuery = Mysql.createQuery;

common.createTestDatabase = function createTestDatabase(connection, callback) {
  var database = common.testDatabase;

  connection.query('CREATE DATABASE ??', [database], function (err) {
    if (err && err.code !== 'ER_DB_CREATE_EXISTS') {
      callback(err);
      return;
    }

    callback(null, database);
  });
};

common.createPool = function(config) {
  config = mergeTestConfig(config);
  config.connectionConfig = mergeTestConfig(config.connectionConfig);
  return Mysql.createPool(config);
};

common.createPoolCluster = function(config) {
  config = mergeTestConfig(config);
  config.createConnection = common.createConnection;
  return Mysql.createPoolCluster(config);
};

common.createFakeServer = function(options) {
  return new FakeServer(common.extend({}, options));
};

common.detectNewline = function detectNewline(path) {
  var newlines = fs.readFileSync(path, 'utf8').match(/(?:\r?\n)/g) || [];
  var crlf = newlines.filter(function (nl) { return nl === '\r\n'; }).length;
  var lf = newlines.length - crlf;

  return crlf > lf ? '\r\n' : '\n';
};

common.extend = function extend(dest, src) {
  for (var key in src) {
    dest[key] = src[key];
  }

  return dest;
};

common.getTestConnection = function getTestConnection(config, callback) {
  if (!callback && typeof config === 'function') {
    callback = config;
    config = {};
  }

  var connection = common.createConnection(config);

  connection.connect(function (err) {
    if (err && err.code === 'ECONNREFUSED') {
      if (process.env.CI) {
        throw err;
      }

      common.skipTest('cannot connect to MySQL server');
    }

    if (err) {
      callback(err);
      return;
    }

    callback(null, connection);
  });
};

common.skipTest = function skipTest(message) {
  var msg = 'skipping - ' + message + '\n';

  try {
    fs.writeSync(process.stdout.fd, msg);
    fs.fsyncSync(process.stdout.fd);
  } catch (e) {
    // Ignore error
  }

  process.exit(0);
};

common.useTestDb = function(connection) {
  common.createTestDatabase(connection, function (err) {
    if (err) throw err;
  });

  connection.query('USE ' + common.testDatabase);
};

common.getTestConfig = function(config) {
  return mergeTestConfig(config);
};

common.getSSLConfig = function() {
  return {
    ca      : fs.readFileSync(path.join(common.fixtures, 'server.crt'), 'ascii'),
    cert    : fs.readFileSync(path.join(common.fixtures, 'server.crt'), 'ascii'),
    ciphers : 'ECDHE-RSA-AES128-SHA256:AES128-GCM-SHA256:AES128-SHA:HIGH:!MD5:!aNULL:!EDH',
    key     : fs.readFileSync(path.join(common.fixtures, 'server.key'), 'ascii')
  };
};

function mergeTestConfig(config) {
  config = common.extend({
    host       : process.env.MYSQL_HOST,
    port       : process.env.MYSQL_PORT,
    user       : process.env.MYSQL_USER,
    password   : process.env.MYSQL_PASSWORD,
    socketPath : process.env.MYSQL_SOCKET
  }, config);

  return config;
}
