var script   = process.cwd() + '/' + process.argv[2];
var execFile = require('child_process').execFile;

var options = {
  scriptExecutions: 10,
  scriptTimeout: 5 * 1000,
}

var bestHz = 0;
function runScript() {
  var child = execFile(process.execPath, [script], function(err, stdout, stderr) {
    if (err && !err.killed) throw err;

    var match = stdout.match(/([\d]+) hz\n$/i);
    if (!match) {
      throw new Error('Could not parse best frequency from:\n\n ' + stdout);
    }

    var hz = parseInt(match[1], 10);
    if (hz > bestHz) {
      bestHz = hz;
      console.log(hz + ' Hz');
    } else {
      console.log('.');
    }

    runScript();
  });

  setTimeout(child.kill.bind(child), options.scriptTimeout);
}

runScript();
