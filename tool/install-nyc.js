var path  = require('path');
var spawn = require('child_process').spawn;

process.nextTick(run);

function installNpmModule(name, version, callback) {
  if (getPackageVersion(name) === version) {
    callback();
    return;
  }

  var spec  = name + '@' + version;
  var args  = ['install', '--silent', '--no-save', spec];
  var child = spawn('npm', args, {
    cwd   : path.join(__dirname, '..'),
    shell : true
  });

  child.stderr.resume();
  child.stdout.resume();

  child.on('exit', function (code) {
    var err = null;

    if (code !== 0) {
      err = new Error('npm install ' + spec + ' failed with exit code ' + code);
    }

    callback(err);
  });
}

function getNycVersion() {
  var nodeVersion = process.version.replace(/^v/, '').split('.')
    .map(function (s) { return Number(s); });

  if (nodeVersion[0] === 0 && nodeVersion[1] < 10) {
    return undefined;
  } else if (nodeVersion[0] < 4) {
    return '10.3.2';
  } else if (nodeVersion[0] < 6) {
    return '11.9.0';
  } else {
    return '13.2.0';
  }
}

function getPackageVersion(name) {
  try {
    return require(name + '/package').version;
  } catch (e) {
    return undefined;
  }
}

function run() {
  var args    = process.argv.slice(2);
  var cmd     = null;
  var divider = args.indexOf('--');
  var version = getNycVersion();

  if (divider !== -1) {
    cmd  = args.slice(divider + 1);
    args = args.slice(0, divider);
  }

  if (!version && args.indexOf('--nyc-optional') === -1) {
    console.error('nyc does not support current Node.js version');
    process.exit(1);
  } else if (version) {
    installNpmModule('nyc', version, function (err) {
      if (err) {
        console.error(err.message);
        process.exit(1);
      } else if (cmd) {
        runCmd('nyc', args.concat(cmd));
      }
    });
  } else if (cmd) {
    runCmd(cmd[0], cmd.slice(1));
  }
}

function runCmd(cmd, args) {
  var child = spawn(cmd, args, {
    cwd   : path.join(__dirname, '..'),
    shell : true
  });

  child.stderr.pipe(process.stderr, {end: false});
  child.stdout.pipe(process.stdout, {end: false});

  child.on('exit', function (code) {
    process.exit(code);
  });
}
