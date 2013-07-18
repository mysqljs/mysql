module.exports.init = function(connection) {

  connection.primary = function(table, callback) {
    this.queryRow('SHOW KEYS FROM ?? WHERE Key_name = "PRIMARY"', [table], function(err, res) {
      if (err) res = false;
      callback(err, res);
    });
  }

  connection.foreign = function(table, callback) {
    this.queryHash(
      'SELECT CONSTRAINT_NAME, COLUMN_NAME, ORDINAL_POSITION, POSITION_IN_UNIQUE_CONSTRAINT, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME '+
      'FROM information_schema.KEY_COLUMN_USAGE '+
      'WHERE REFERENCED_TABLE_NAME IS NOT NULL AND CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? '+
      'ORDER BY REFERENCED_TABLE_NAME',
      [table],
      function(err, res) {
        if (err) res = false;
        callback(err, res);
      }
    );
  }

  connection.constraints = function(table, callback) {
    this.queryHash(
      'SELECT CONSTRAINT_NAME, UNIQUE_CONSTRAINT_NAME, REFERENCED_TABLE_NAME, MATCH_OPTION, UPDATE_RULE, DELETE_RULE '+
      'FROM information_schema.REFERENTIAL_CONSTRAINTS '+
      'WHERE TABLE_NAME = ? '+
      'ORDER BY CONSTRAINT_NAME',
      [table],
      function(err, res) {
        if (err) res = false;
        callback(err, res);
      }
    );
  }

  connection.fields = function(table, callback) {
    this.queryHash('SHOW FULL COLUMNS FROM ??', [table], function(err, res) {
      if (err) res = false;
      callback(err, res);
    });
  }

  connection.databases = function(callback) {
    this.queryArray('SHOW DATABASES', [], function(err, res) {
      if (err) res = false;
      callback(err, res);
    });
  }

  connection.tables = function(callback) {
    this.queryHash(
      'SELECT TABLE_NAME, TABLE_TYPE, ENGINE, VERSION, ROW_FORMAT, TABLE_ROWS, '+
      'AVG_ROW_LENGTH, DATA_LENGTH, MAX_DATA_LENGTH, INDEX_LENGTH, DATA_FREE, AUTO_INCREMENT, '+
      'CREATE_TIME, UPDATE_TIME, CHECK_TIME, TABLE_COLLATION, CHECKSUM, CREATE_OPTIONS, TABLE_COMMENT '+
      'FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()', [],
      function(err, res) {
        if (err) res = false;
        callback(err, res);
      }
    );
  }

  connection.tableInfo = function(table, callback) {
    this.queryRow('SHOW TABLE STATUS LIKE ?', [table], function(err, res) {
      if (err) res = false;
      callback(err, res);
    });
  }

  connection.indexes = function(table, callback) {
    this.query('SHOW INDEX FROM ??', [table], function(err, res) {
      var result = {};
      if (err) result = false; else {
        for (var i in res) {
          var row = res[i];
          result[row['Key_name']] = row;
        }
      }
      callback(err, result);
    });
  }

  connection.processes = function(callback) {
    this.query('SELECT * FROM information_schema.PROCESSLIST', [], function(err, res) {
      if (err) res = false;
      callback(err, res);
    });
  }

  connection.globalVariables = function(callback) {
    this.queryKeyValue('SELECT * FROM information_schema.GLOBAL_VARIABLES', [], function(err, res) {
      if (err) res = false;
      callback(err, res);
    });
  }

  connection.globalStatus = function(callback) {
    this.queryKeyValue('SELECT * FROM information_schema.GLOBAL_STATUS', [], function(err, res) {
      if (err) res = false;
      callback(err, res);
    });
  }

  connection.users = function(callback) {
    this.query('SELECT * FROM mysql.user', [], function(err, res) {
      if (err) res = false;
      callback(err, res);
    });
  }

}