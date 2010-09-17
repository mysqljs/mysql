test:
	@find test/{simple,system}/test-*.js | xargs -n 1 -t node
test-all: test
	@find test/system/slow/test-*.js | xargs -n 1 -t node

.PHONY: test
