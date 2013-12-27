var common = require('../../common');
var path = require('path')
var createQuery = require(path.join(common.lib, 'Connection')).createQuery

var query = createQuery('SELECT * FROM some_table')
var stream = query.stream()

// put the stream into flowing mode
stream.on('data', function () { })
