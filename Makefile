test:
	@find test/simple/test-*.js | xargs -n 1 -t node
	@find test/system/test-*.js | xargs -n 1 -t node
test-all: test
	@find test/system/slow/test-*.js | xargs -n 1 -t node
benchmark-node-mysql:
	@find benchmark/node-mysql/*.js | xargs -n 1 -t node
benchmark-php:
	@find benchmark/php/*.php | xargs -n 1 -t php
benchmark-all: benchmark-node-mysql benchmark-php
benchmark: benchmark-node-mysql

.PHONY: test benchmark
