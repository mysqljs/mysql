SHELL := /bin/bash

test-simple:
	@find test/simple/test-*.js | xargs -n 1 -t node
test-system:
	@find test/system/test-*.js | xargs -n 1 -t node
test-system-slow:
	@find test/system/slow/test-*.js | xargs -n 1 -t node
# Dangerous tests potentially effect the MySql server settings, don't run these in production!
test-system-dangerous:
	@find test/system/dangerous/test-*.js | xargs -n 1 -t node
test: test-simple test-system
test-all: test test-system-slow test-system-dangerous
benchmark-node-mysql:
	@find benchmark/node-mysql/*.js | xargs -n 1 -t node
benchmark-php:
	@find benchmark/php/*.php | xargs -n 1 -t php
benchmark-all: benchmark-node-mysql benchmark-php
benchmark: benchmark-node-mysql

.PHONY: test benchmark
