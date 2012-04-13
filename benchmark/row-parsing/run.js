var Parser        = require('../../lib/protocol/Parser');
var BufferCreator = require('./BufferCreator');
var rowCount      = 100000;
var bufferSize    = 64 * 1024;
var profiler      = require('profiler');

profiler.pause();

var value = '';
for (var i = 0; i < 256; i++) {
  value += 'a';
}

var rowId = 0;
var row = {
  id: function() {
    return rowId++;
  },
  some_field: value,
};

console.log(
  '---> Generating %s rows inside %s kb buffers ...',
  rowCount,
  bufferSize / 1024
);

var start = Date.now();

var buffers = BufferCreator.create({
  rowCount   : rowCount,
  bufferSize : bufferSize,
  row        : row,
});

var duration = Date.now() - start;

var length = buffers.reduce(function(total, buffer) {
  return total + buffer.length;
}, 0);

console.log(
  'Generated %s buffers (%s mb) in %s ms.',
  buffers.length,
  (length / 1024 / 1024).toFixed(2),
  duration
);

console.log('---> Parsing rows ...');

var fieldPackets = [
  {name: 'id', fieldType: Parser.FIELD_TYPE_LONG},
  {name: 'some_field', fieldType: Parser.FIELD_TYPE_VARCHAR},
];

var parser = new Parser({
  fieldPackets: fieldPackets,
});

profiler.resume();

var start = Date.now();
var repeat = 10;
for (var i = 0; i < repeat; i++) {
  buffers.forEach(function(buffer) {
    parser.write(buffer);
  });
}

rowCount = rowCount * repeat;
length = length * repeat;

var duration = Date.now() - start;
var frequency = (rowCount / (duration / 1000));

if (frequency > Math.pow(10, 6)) {
  frequency = (frequency / Math.pow(10, 6)).toFixed(2) + ' Mhz';
} else if (frequency > Math.pow(10, 3)) {
  frequency = (frequency / Math.pow(10, 3)).toFixed(2) + ' Khz';
} else {
  frequency = (frequency) + ' Hz';
}

var throughput = (length / (duration / 1000));
if (throughput > Math.pow(1024, 2)) {
  throughput = (throughput / Math.pow(1024, 2)).toFixed(2) + ' Mb / sec';
} else if (throughput > Math.pow(1024, 1)) {
  throughput = (throughput / Math.pow(1024, 1)).toFixed(2) + ' Kb / sec';
} else {
  frequency = (frequency) + ' Byte / sec';
}

console.log(
  'Parsed %s rows in %s ms (%s / %s)',
  rowCount,
  duration,
  frequency,
  throughput
);
