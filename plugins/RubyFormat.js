var SqlString = require('../lib/protocol/SqlString');

module.exports = function (Connection) {
  Connection.format = function (sql, values) {
    values = values || {};

    return sql.replace(/\:(\w+)/, function (m, k) {
      return SqlString.escape(values[k], false, Connection._timezone);
    });
  };
};
