const co = require('co');
const assertTxFailed = require('../test-util/assert-transaction-fails');
let Splitter = artifacts.require("./Splitter.sol");

contract('Splitter', function(accounts) {

    describe('disburseFunds()', () => {

        let validValue;
        let invalidValue;
        let gasLimit;
        let splitter;
        beforeEach(() => {
            return co(function*() {
	            validValue = 10;
	            invalidValue = 11;
	            gasLimit = 1000000;
	            splitter = yield Splitter.deployed();
            });
        });

        describe('without setting recipients first', () => {

	        beforeEach(() => {
		        return co(function*() {
			        splitter = yield Splitter.new();
		        });
	        });

            it('should fail', () => {
                return co(function*() {
	                const action = () => function*() {
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
	                const txHash = yield splitter.setRecipients(accounts[1], accounts[2], {from: accounts[0], gas: gasLimit});
	                assert(txHash.receipt.gasUsed < gasLimit, "Recipients should be set successfully");
                });
            });

	        describe('when passed a valid value', () => {

		        it('should succeed', () => {
		            return co(function*() {
			            const txHash = yield splitter.disburseFunds({value: validValue, gas: gasLimit});
			            assert(txHash.receipt.gasUsed < gasLimit, "Disbursal should succeed");
                    });
		        });
	        });

            describe('when passed an invalid value', () => {

                it('should fail', () => {
	                return co(function*() {
	                	const action = () => function*() {
	                		return yield splitter.disburseFunds({value: invalidValue, gas: gasLimit});
		                };
		                yield assertTxFailed(action, gasLimit, web3);
	                });
                });
            });
        });
    });
});
