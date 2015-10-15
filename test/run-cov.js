var fs       = require('fs');
var istanbul = require('istanbul');
var mkdirp   = require('mkdirp');
var path     = require('path');
var rimraf   = require('rimraf');
var spawn    = require('child_process').spawn;

var istanbulcli = path.resolve(__dirname, '../node_modules/istanbul/lib/cli.js');
var libcov      = path.resolve(__dirname, '../lib-cov');

rimraf.sync(libcov);
mkdirp.sync(libcov);

instrument('index.js', function (err) {
  if (err) return handleError(err);
  instrument('lib', function (err) {
    if (err) return handleError(err);
    run(function (err, code) {
      if (err) return handleError(err);
      reportCoverage(collectCoverage(path.resolve(libcov, 'test')));
      rimraf.sync(libcov);
      process.exit(code);
    });
  });
});

function collectCoverage(dir) {
  var collector = new istanbul.Collector();
  var coverage  = require('require-all')({
    dirname : dir,
    filter  : /^(test-.+?)\.json$/i
  });
  var obj       = null;
  var objs      = [coverage];

  while ((obj = objs.shift())) {
    for (var key in obj) {
      if (/^test-/.test(key)) {
        collector.add(obj[key]);
      } else {
        objs.push(obj[key]);
      }
    }
  }

  return collector;
}

function handleError(err) {
  rimraf.sync(libcov);
  throw err;
}

function instrument(target, callback) {
  var args = [istanbulcli, 'instrument', path.resolve(__dirname, '..', target), '-o', path.resolve(libcov, target)];
  var exec = process.argv[0];
  var proc = spawn(exec, args, {stdio: 'ignore'});

  proc.on('error', callback);
  proc.on('exit', function (code) {
    callback(code === 0 ? null : new Error('non-zero exit code: ' + code));
  });
}

function reportCoverage(collector) {
  var reporter = new istanbul.Reporter(null, path.resolve(__dirname, '../coverage'));
  var style    = process.argv[2];

  rimraf.sync(reporter.dir);
  mkdirp.sync(reporter.dir);

  reporter.add(style || 'lcov');
  reporter.add('text-summary');
  reporter.write(collector, true, function(){});
}

function run(callback) {
  var args = [path.resolve(__dirname, 'run.js')];
  var env  = Object.create(null);
  var exec = process.argv[0];

  for (var key in process.env) {
    env[key] = process.env[key];
  }

  env.TEST_COVERAGE = 'lib-cov';

  var proc = spawn(exec, args, {env: env, stdio: 'inherit'});

  proc.on('error', callback);
  proc.on('exit', function (code) {
    callback(null, code);
  });
}
