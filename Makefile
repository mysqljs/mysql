SHELL := /bin/bash
NODE   = node

test:
	@$(NODE) test/run.js
benchmark-node-mysql:
	@find benchmark/node-mysql/*.js | xargs -n 1 -t node
benchmark-php:
	@find benchmark/php/*.php | xargs -n 1 -t php
benchmark-all: benchmark-node-mysql benchmark-php
benchmark: benchmark-node-mysql

.PHONY: test benchmark
