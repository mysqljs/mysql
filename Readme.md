# Node MySql

## Purpose

A node.js module implementing the
[MySql protocol](http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol).

## Design Goals

* Simplicity: The MySql protocol is easy, a good parser should reflect that
* Efficiency: Use fast algorithms, buffers and as little memory as possible.
* Portability: Should run anywhere node runs
* Completeness: The goal is to support the full MySql API.

## Current state

Not ready for anything yet.

## Sponsors

* [Joyent](http://www.joyent.com/)

This is a big effort. If your company could benefit from a top-notch MySql driver
for node, a small sponsorship payment would be greatly appreciated.

## Todo

* Authentication
* High level API
* Queries
* Prepared Statements
* ...