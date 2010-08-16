# node-mysql

## Purpose

A node.js module implementing the
[MySQL protocol](http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol).

## Design Goals

* Simplicity: The MySQL protocol is easy, a good parser should reflect that
* Efficiency: Use fast algorithms, buffers and as little memory as possible.
* Portability: Should run anywhere node runs
* Completeness: The goal is to support the full MySQL API.

## Todo

At this point this module is not ready for anything yet.

* Prepared Statements
* Test using no Password
* Charsets handling
* Import Error code constants
* ...

## License

node-mysql is licensed under the MIT license.

## Sponsors

* [Joyent](http://www.joyent.com/)

This is a big effort. If your company could benefit from a top-notch MySQL driver
for node, a small sponsorship payment would be greatly appreciated. Contact
me at [felix@debuggable.com](mailto:felix@debuggable.com) for details.
