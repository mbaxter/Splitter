const co = require('co');
const assertTxFailed = require('../test-util/assert-transaction-fails');
let Splitter = artifacts.require("./Splitter.sol");

contract('Splitter', function(accounts) {

	let gasLimit, splitter, txOptions;
	before(() => {
		return co(function*(){
			gasLimit = 1000000;
			splitter = yield Splitter.deployed();
			txOptions = {gas: gasLimit, from:accounts[0]};
		});
	});

	describe('setRecipients', () => {

		beforeEach(() => {
			return co(function*(){
				splitter = yield Splitter.new({from: accounts[0]});
			});
		});

		describe('with duplicate recipients', () => {
			it('should fail', () => {
				return co(function*() {
					const action = function*() {
						return yield splitter.setRecipients(accounts[1], accounts[1], txOptions);
					};
					yield assertTxFailed(action, gasLimit, web3);
				});
			});
		});

		describe('with first recipient equal to sender', () => {
			it('should fail', () => {
				return co(function*() {
					const action = function*() {
						return yield splitter.setRecipients(accounts[0], accounts[2], txOptions);
					};
					yield assertTxFailed(action, gasLimit, web3);
				});
			});
		});

		describe('with second recipient equal to sender', () => {
			it('should fail', () => {
				return co(function*() {
					const action = function*() {
						return yield splitter.setRecipients(accounts[2], accounts[0], txOptions);
					};
					yield assertTxFailed(action, gasLimit, web3);
				});
			});
		});

		describe('with distinct recipients not equal to sender', () => {
			it('should succeed', () => {
				return co(function*(){
					const txHash = yield splitter.setRecipients(accounts[1], accounts[2], txOptions);
					assert(txHash.receipt.gasUsed < gasLimit, "Transaction should succeed");
				});
			});
		});
	});

    describe('disburseFunds()', () => {

        let validValue;
        let invalidValue;
        beforeEach(() => {
            return co(function*() {
	            validValue = 10;
	            invalidValue = 11;
            });
        });

        describe('without setting recipients first', () => {

	        beforeEach(() => {
		        return co(function*() {
			        splitter = yield Splitter.new({from: accounts[0]});
		        });
	        });

            it('should fail', () => {
                return co(function*() {
	                const action = function*() {
		                return yield splitter.disburseFunds({value: validValue, gas: gasLimit});
	                };
	                yield assertTxFailed(action, gasLimit, web3);
                });
            });
        });

        describe('after setting recipients', () => {

            beforeEach(() => {
                return co(function*() {
	                splitter = yield Splitter.new({from: accounts[0]});
	                assert(splitter, "New contract should be deployed");
	                const txHash = yield splitter.setRecipients(accounts[1], accounts[2], txOptions);
	                assert(txHash.receipt.gasUsed < gasLimit, "Recipients should be set successfully");
                });
            });

	        describe('when passed a valid value', () => {

		        it('should succeed', () => {
		            return co(function*() {
			            const txHash = yield splitter.disburseFunds({value: validValue, gas: gasLimit, from:accounts[0]});
			            assert(txHash.receipt.gasUsed < gasLimit, "Disbursal should succeed");
                    });
		        });
	        });

            describe('when passed an invalid value', () => {

                it('should fail', () => {
	                return co(function*() {
	                	const action = function*() {
	                		return yield splitter.disburseFunds({value: invalidValue, gas: gasLimit, from:accounts[0]});
		                };
		                yield assertTxFailed(action, gasLimit, web3);
	                });
                });
            });
        });
    });
});
