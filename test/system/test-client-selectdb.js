require('../common');
var client = require('mysql').Client(TEST_CONFIG),
    gently = new Gently();

client.connect(gently.expect(function connectCb(err, result) {
    if (err) throw err;

    assert.strictEqual(result.affectedRows, 0);
  
    client.selectDB('mysql', function() {   
        client.query('show tables', function(err, rows, fields) {
            //console.log('Showing tables from mysql database: ', rows.length);
            var name = '';
            for (var i in fields) {
                name = i.replace('Tables_in_', '').toLowerCase();
            }
            assert.equal(name, 'mysql');
            client.selectDB('information_schema', function() {
                client.query('show tables', function(err, rows, fields) {
                    //console.log('Show tables from information_schema: ', rows.length);
                    var name = '';
                    for (var i in fields) {
                        name = i.replace('Tables_in_', '').toLowerCase();
                    }
                    assert.equal(name, 'information_schema');
                    client.end();
                });
            });
        });
    });

}));

