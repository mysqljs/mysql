test:
	@find test/{simple,system}/test-*.js | xargs -n 1 -t node

.PHONY: test