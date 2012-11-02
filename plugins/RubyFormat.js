module.exports = function (Connection) {
  Connection.format = function (sql, values) {
    values = values || {};

    return sql.replace(/\:(\w+)/, function (m, k) {
      return values[k] || 'NULL';
    });
  };
};
