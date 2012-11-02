module.exports = function (Connection) {
  Connection.procedures = {
    call: function(procedure, values, cb) {
      if (typeof values == 'function') {
        cb     = values;
        values = undefined;
      }

      Connection.query("CALL " + procedure, values, function (err) {
        if (err) return cb(err);

        var m = procedure.match(/(@[a-z0-9_\.\$]+|@'.*?'|@".*?"|@`.*?`)/ig);
        if (m === null) {
          // no parameters used, just return
          return cb(null);
        }

        Connection.query("SELECT " + m.join(', '), function (err, data) {
          if (err) return cb(err);

          var results = {};
          for (var k in data[0]) {
            if (!data[0].hasOwnProperty(k)) continue;

            if ([ '\'', '"', '`' ].indexOf(k[1]) >= 0 && k[1] == k.substr(-1)) {
              results[k.substr(2, k.length - 3)] = data[0][k];
            } else {
              results[k.substr(1)] = data[0][k];
            }
          }

          return cb(null, results);
        });
      });
    }
  };
};
