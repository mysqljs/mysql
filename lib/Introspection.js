module.exports.init = function(connection) {

  connection.primary = function(table, callback) {
    this.queryRow('SHOW KEYS FROM ?? WHERE Key_name = "PRIMARY"', [table], function(err, res) {
      callback(err, res);
    });
  }

  connection.foreign = function(table, callback) {
    this.query(
      'SELECT CONSTRAINT_NAME, COLUMN_NAME, ORDINAL_POSITION, POSITION_IN_UNIQUE_CONSTRAINT, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME '+
      'FROM information_schema.KEY_COLUMN_USAGE '+
      'WHERE REFERENCED_TABLE_NAME IS NOT NULL AND CONSTRAINT_SCHEMA = ? AND TABLE_NAME = ? '+
      'ORDER BY REFERENCED_TABLE_NAME',
      [this.config.database, table],
      function(err, res) {
        if (err) res = false;
        callback(err, res);
      }
    );
  }

  connection.fields = function(table, callback) {
    this.query('SHOW FULL COLUMNS FROM ??', [table], function(err, res) {
      if (err) res = false;
      callback(err, res);
    });
  }

  connection.databases = function(mask, callback) {
    this.query('SHOW DATABASES LIKE ?', [mask], function(err, res) {
      var result = [];
      if (err) result = false; else {
        for (var i in res) {
          var row = res[i];
          result.push(row[Object.keys(row)[0]]);
        }
      }
      callback(err, result);
    });
  }

  connection.tables = function(mask, callback) {
    this.query('SHOW TABLES LIKE ?', [mask], function(err, res) {
      var result = [];
      if (err) result = false; else {
        for (var i in res) {
          var row = res[i];
          result.push(row[Object.keys(row)[0]]);
        }
      }
      callback(err, result);
    });
  }

  connection.tableInfo = function(table, callback) {
    this.query('SHOW TABLE STATUS LIKE ?', [table], function(err, res) {
      if (err) res = false;
      callback(err, res);
    });
  }

}