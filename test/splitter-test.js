const co = require('co');
const assertTxFailed = require('../test-util/assert-transaction-fails');
let Splitter = artifacts.require("./Splitter.sol");
const ethUtil = require('ethereumjs-util');

contract('Splitter', function(accounts) {

	let gasLimit, splitter, txOptions;
	before(() => {
		return co(function*(){
			gasLimit = 1000000;
			splitter = yield Splitter.deployed();
			txOptions = {gas: gasLimit, from:accounts[0]};
		});
	});

	describe('create contract', () => {

		describe('with no recipients', () => {
			it('should fail', () => {
				return co(function*() {
					const action = function*() {
						return yield Splitter.new(0,0, {from: accounts[0]});
					};
					yield assertTxFailed(action, gasLimit, web3);
				});
			});
		});

		describe('with duplicate recipients', () => {
			it('should fail', () => {
				return co(function*() {
					const action = function*() {
						yield Splitter.new(accounts[1], accounts[1], {from: accounts[0]});
					};
					yield assertTxFailed(action, gasLimit, web3);
				});
			});
		});

		describe('with first recipient equal to sender', () => {
			it('should fail', () => {
				return co(function*() {
					const action = function*() {
						return yield Splitter.new(accounts[0], accounts[2], txOptions);
					};
					yield assertTxFailed(action, gasLimit, web3);
				});
			});
		});

		describe('with second recipient equal to sender', () => {
			it('should fail', () => {
				return co(function*() {
					const action = function*() {
						return yield Splitter.new(accounts[2], accounts[0], txOptions);
					};
					yield assertTxFailed(action, gasLimit, web3);
				});
			});
		});

		describe('with first recipient equal to the contract', () => {
			it('should fail', () => {
				return co(function*() {
					const action = function*() {
						// From: https://github.com/b9lab/cyclical-reference/blob/master/migrations/2_deploy_contracts.js
						const nonce = web3.eth.getTransactionCount(txOptions.from);
						const contractAddress = ethUtil.bufferToHex(ethUtil.generateAddress(txOptions.from, nonce));
						return yield Splitter.new(contractAddress, accounts[2], txOptions);
					};
					yield assertTxFailed(action, gasLimit, web3);
				});
			});
		});

		describe('with second recipient equal to the contract', () => {
			it('should fail', () => {
				return co(function*() {
					const action = function*() {
						// From: https://github.com/b9lab/cyclical-reference/blob/master/migrations/2_deploy_contracts.js
						const nonce = web3.eth.getTransactionCount(txOptions.from);
						const contractAddress = ethUtil.bufferToHex(ethUtil.generateAddress(txOptions.from, nonce));
						return yield Splitter.new(accounts[2], contractAddress, txOptions);
					};
					yield assertTxFailed(action, gasLimit, web3);
				});
			});
		});

		describe('with distinct recipients not equal to sender or contract', () => {
			it('should succeed', () => {
				return co(function*(){
					const splitter = yield Splitter.new(accounts[1], accounts[2], txOptions);
					assert.ok(splitter);
					assert.ok(splitter.address);

					const recipients = yield splitter.recipients.call(txOptions);
					assert.equal(recipients[0], accounts[1]);
					assert.equal(recipients[1], accounts[2]);
				});
			});
		});
	});

	describe('sendFunds()', () => {
		let recipients;
		beforeEach(() => {
			return co(function*() {
				splitter = yield Splitter.new(accounts[1], accounts[2], {from: accounts[0]});
				assert(splitter, "New contract should be deployed");
				recipients = [accounts[1], accounts[2]];
			});
		});

		describe('when passed a valid value', () => {

			describe('that is even', () => {

				let txHash;
				let value;
				beforeEach(() => {
					return co(function*() {
						value = 10;
						txHash = yield splitter.sendFunds({ value: value, gas: gasLimit, from:accounts[0] });
					});
				});

				it('should succeed', () => {
					return co(function*() {
						assert.ok(txHash);
						assert(txHash.receipt.gasUsed < gasLimit);
					});
				});

				it('should update recipientA\'s balance', () => {
					return co(function*() {
						const balance = yield splitter.balance.call(recipients[0]);
						assert.equal(balance, value / 2);
					});
				});

				it('should update recipientB\'s balance', () => {
					return co(function*() {
						const balance = yield splitter.balance.call(recipients[1]);
						assert.equal(balance, value / 2);
					});
				});

				it('should not update the owner\'s balance', () => {
					return co(function*() {
						const balance = yield splitter.balance.call(txOptions.from);
						assert.equal(balance, 0);
					});
				});
			});

			describe('that is odd', () => {

				let txHash;
				let value;
				beforeEach(() => {
					return co(function*() {
						value = 11;
						txHash = yield splitter.sendFunds({ value: value, gas: gasLimit, from:accounts[0] });
					});
				});

				it('should succeed', () => {
					return co(function*() {
						assert.ok(txHash);
						assert(txHash.receipt.gasUsed < gasLimit);
					});
				});

				it('should update recipientA\'s balance', () => {
					return co(function*() {
						const balance = yield splitter.balance.call(recipients[0]);
						assert.equal(balance, Math.floor(value / 2));
					});
				});

				it('should update recipientB\'s balance', () => {
					return co(function*() {
						const balance = yield splitter.balance.call(recipients[1]);
						assert.equal(balance, Math.floor(value / 2));
					});
				});

				it('should not update the owner\'s balance', () => {
					return co(function*() {
						const balance = yield splitter.balance.call(txOptions.from);
						assert.equal(balance, 1);
					});
				});
			});
		});

		describe('when passed an invalid value', () => {

			describe('of 1', () => {

				it('should fail', () => {
					return co(function*() {
						const action = function*() {
							return yield splitter.sendFunds({value: 1, gas: gasLimit, from:accounts[0]});
						};
						yield assertTxFailed(action, gasLimit, web3);
					});
				});
			});

			describe('of 0', () => {

				it('should fail', () => {
					return co(function*() {
						const action = function*() {
							return yield splitter.sendFunds({value: 0, gas: gasLimit, from:accounts[0]});
						};
						yield assertTxFailed(action, gasLimit, web3);
					});
				});
			});
		});
	});

	describe('withdrawFunds()', () => {

		beforeEach(() => {
			return co(function*() {
				splitter = yield Splitter.new(accounts[1], accounts[2], {from: accounts[0]});
				assert(splitter, "New contract should be deployed");
			});
		});

		describe('for an account with no balance', () => {
			it('should fail', () => {
				return co(function*() {
					const action = function*() {
						return yield splitter.withdrawFunds({gas: gasLimit, from:accounts[3]});
					};
					yield assertTxFailed(action, gasLimit, web3);
				});
			});
		});

		describe('for an account with a balance', () => {
			let txHash;
			let account;
			beforeEach(() => {
				return co(function*(){
					const value = 10;
					account = accounts[1];
					yield splitter.sendFunds({ value, gas: gasLimit, from:accounts[0] });
					txHash = yield splitter.withdrawFunds({ gas: gasLimit, from:account });
				});
			});

			it('should succeed', () => {
				return co(function*() {
					assert.ok(txHash);
					assert(txHash.receipt.gasUsed < gasLimit);
				});
			});

			it('should zero-out the balance', () => {
				return co(function*() {
					const actualBalance = yield splitter.balance.call(account, txOptions);
					assert.equal(actualBalance, 0);
				});
			});
		});
	});
});
