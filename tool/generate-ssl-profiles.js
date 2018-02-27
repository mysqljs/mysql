#!/usr/bin/env node
var crypto = require('crypto');
var fs     = require('fs');
var path   = require('path');
var x509   = require('x509.js');

var srcDir = process.argv[2];
if (!srcDir) {
  var args = [];
  args[0] = process.argv[0].indexOf(' ') !== -1
    ? '"' + process.argv[0] + '"'
    : process.argv[0];
  args[1] = process.argv[1].indexOf(' ') !== -1
    ? '"' + process.argv[1] + '"'
    : process.argv[1];
  args[2] = path.join('path', 'to', 'mysql', 'src');
  console.error('Usage: ' + args.join(' '));
  process.exit(1);
}

extractCertificates().forEach(function (cert) {
  var notAfter = new Date(cert.notAfter);
  var notBefore = new Date(cert.notBefore);

  console.log('    /**');
  console.log('     * %s %d to %d', cert.subject.commonName, notBefore.getFullYear(), notAfter.getFullYear());
  console.log('     *');
  console.log('     *   CN = %s', cert.subject.commonName);
  console.log('     *   OU = %s', cert.subject.organizationalUnitName);
  console.log('     *   O = %s', cert.subject.organizationName);
  console.log('     *   L = %s', cert.subject.localityName);
  console.log('     *   ST = %s', cert.subject.stateOrProvinceName);
  console.log('     *   C = %s', cert.subject.countryName);
  console.log('     *   P = %s/%s', notBefore.toISOString().replace(/\.\d{3}/, ''), notAfter.toISOString().replace(/\.\d{3}/, ''));
  console.log('     *   F = %s', fingerprint(cert));
  console.log('     */');

  cert.raw.split(/\r?\n/).forEach(function (line, index) {
    line && console.log('    %s\'%s\\n\'', (index ? '+ ' : ''), line);
  });

  console.log();
});

console.log('  ]');
console.log('};');

function extractCertificates() {
  var contents = fs.readFileSync(srcDir, 'ascii');
  var regexp   = /^(?=-----BEGIN CERTIFICATE-----)/m;
  //var regexp   = /^(?:-----(?:BEGIN|END) CERTIFICATE-----\r?\n)+/m;

  return contents.split(regexp).map(function (data) {
    return Object.assign(x509.parseCert(data), { raw: data });
  });
}

function fingerprint(cert) {
  var b64 = cert.raw
    .replace(/^-----(.+?)-----$/gm, '');

  return crypto.createHash('sha1')
    .update(b64, 'base64')
    .digest('hex')
    .toUpperCase()
    .split(/(..)/)
    .filter(Boolean)
    .join(':');
}
