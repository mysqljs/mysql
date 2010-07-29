var client = require('../lib/mysql/mysql').Client();

client.user = 'root';
client.password = 'root';
client.database = 'tvype';

client.connect();