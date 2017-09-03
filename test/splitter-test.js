const assertTxFailed = require('../test-util/assert-transaction-fails');
let Splitter = artifacts.require("./Splitter.sol");
const ethUtil = require('ethereumjs-util');

contract('Splitter', function(accounts) {

	let gasLimit, splitter, txOptions;
	before(async () => {
		gasLimit = 1000000;
		splitter = await Splitter.deployed();
		txOptions = {gas: gasLimit, from:accounts[0]};
	});

	describe('create contract', () => {

		describe('with no recipients', () => {
			it('should fail', async () => {
				const action = async () => {
					return await Splitter.new(0,0, {from: accounts[0]});
				};
				await assertTxFailed(action, gasLimit, web3);
			});
		});

		describe('with duplicate recipients', () => {
			it('should fail', async () => {
				const action = async () => {
					await Splitter.new(accounts[1], accounts[1], {from: accounts[0]});
				};
				await assertTxFailed(action, gasLimit, web3);
			});
		});

		describe('with first recipient equal to sender', () => {
			it('should fail', async () => {
				const action = async () => {
					return await Splitter.new(accounts[0], accounts[2], txOptions);
				};
				await assertTxFailed(action, gasLimit, web3);
			});
		});

		describe('with second recipient equal to sender', () => {
			it('should fail', async () => {
				const action = async () => {
					return await Splitter.new(accounts[2], accounts[0], txOptions);
				};
				await assertTxFailed(action, gasLimit, web3);
			});
		});

		describe('with first recipient equal to the contract', () => {
			it('should fail', async () => {
				const action = async () => {
					// From: https://github.com/b9lab/cyclical-reference/blob/master/migrations/2_deploy_contracts.js
					const nonce = web3.eth.getTransactionCount(txOptions.from);
					const contractAddress = ethUtil.bufferToHex(ethUtil.generateAddress(txOptions.from, nonce));
					return await Splitter.new(contractAddress, accounts[2], txOptions);
				};
				await assertTxFailed(action, gasLimit, web3);
			});
		});

		describe('with second recipient equal to the contract', () => {
			it('should fail', async () => {
				const action = async () => {
					// From: https://github.com/b9lab/cyclical-reference/blob/master/migrations/2_deploy_contracts.js
					const nonce = web3.eth.getTransactionCount(txOptions.from);
					const contractAddress = ethUtil.bufferToHex(ethUtil.generateAddress(txOptions.from, nonce));
					return await Splitter.new(accounts[2], contractAddress, txOptions);
				};
				await assertTxFailed(action, gasLimit, web3);
			});
		});

		describe('with distinct recipients not equal to sender or contract', () => {
			it('should succeed', async () =>{
				const splitter = await Splitter.new(accounts[1], accounts[2], txOptions);
				assert.ok(splitter);
				assert.ok(splitter.address);

				const recipients = await splitter.recipients.call(txOptions);
				assert.equal(recipients[0], accounts[1]);
				assert.equal(recipients[1], accounts[2]);
			});
		});
	});

	describe('sendFunds()', () => {
		let recipients;
		beforeEach(async () => {
			splitter = await Splitter.new(accounts[1], accounts[2], {from: accounts[0]});
			assert(splitter, "New contract should be deployed");
			recipients = [accounts[1], accounts[2]];
		});

		describe('when passed a valid value', () => {

			describe('that is even', () => {

				let txHash;
				let value;
				beforeEach(async () => {
					value = 10;
					txHash = await splitter.sendFunds({ value: value, gas: gasLimit, from:accounts[0] });
				});

				it('should succeed', async () => {
					assert.ok(txHash);
					assert(txHash.receipt.gasUsed < gasLimit);
				});

				it('should update recipientA\'s balance', async () => {
					const balance = await splitter.balance.call(recipients[0]);
					assert.equal(balance, value / 2);
				});

				it('should update recipientB\'s balance', async () => {
					const balance = await splitter.balance.call(recipients[1]);
					assert.equal(balance, value / 2);
				});

				it('should not update the owner\'s balance', async () => {
					const balance = await splitter.balance.call(txOptions.from);
					assert.equal(balance, 0);
				});
			});

			describe('that is odd', () => {

				let txHash;
				let value;
				beforeEach(async () => {
					value = 11;
					txHash = await splitter.sendFunds({ value: value, gas: gasLimit, from:accounts[0] });
				});

				it('should succeed', async () => {
					assert.ok(txHash);
					assert(txHash.receipt.gasUsed < gasLimit);
				});

				it('should update recipientA\'s balance', async () => {
					const balance = await splitter.balance.call(recipients[0]);
					assert.equal(balance, Math.floor(value / 2));
				});

				it('should update recipientB\'s balance', async () => {
					const balance = await splitter.balance.call(recipients[1]);
					assert.equal(balance, Math.floor(value / 2));
				});

				it('should not update the owner\'s balance', async () => {
					const balance = await splitter.balance.call(txOptions.from);
					assert.equal(balance, 1);
				});
			});
		});

		describe('when passed an invalid value', () => {

			describe('of 1', () => {

				it('should fail', async () => {
					const action = async () => {
						return await splitter.sendFunds({value: 1, gas: gasLimit, from:accounts[0]});
					};
					await assertTxFailed(action, gasLimit, web3);
				});
			});

			describe('of 0', () => {

				it('should fail', async () => {
					const action = async () => {
						return await splitter.sendFunds({value: 0, gas: gasLimit, from:accounts[0]});
					};
					await assertTxFailed(action, gasLimit, web3);
				});
			});
		});
	});

	describe('withdrawFunds()', () => {

		beforeEach(async () => {
			splitter = await Splitter.new(accounts[1], accounts[2], {from: accounts[0]});
			assert(splitter, "New contract should be deployed");
		});

		describe('for an account with no balance', () => {
			it('should fail', async () => {
				const action = async () => {
					return await splitter.withdrawFunds({gas: gasLimit, from:accounts[3]});
				};
				await assertTxFailed(action, gasLimit, web3);
			});
		});

		describe('for an account with a balance', () => {
			let txHash;
			let account;
			beforeEach(async () =>{
				const value = 10;
				account = accounts[1];
				await splitter.sendFunds({ value, gas: gasLimit, from:accounts[0] });
				txHash = await splitter.withdrawFunds({ gas: gasLimit, from:account });
			});

			it('should succeed', async () => {
				assert.ok(txHash);
				assert(txHash.receipt.gasUsed < gasLimit);
			});

			it('should zero-out the balance', async () => {
				const actualBalance = await splitter.balance.call(account, txOptions);
				assert.equal(actualBalance, 0);
			});
		});
	});
});
