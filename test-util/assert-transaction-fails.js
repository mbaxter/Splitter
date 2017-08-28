const assert = require('chai').assert;

const testRpcTxFailedRegex = /invalid opcode|invalid jump|out of gas/;
const gethTxFailedRegex = /please check your gas amount/;
const assertTransactionFails = function*(action, gasLimit, web3) {
	try {
		let res = yield action();
		const receipt = res.receipt || (yield web3.eth.getTransactionReceipt(res));
		assert.equal(receipt.gasUsed, gasLimit, "Failed transaction should consume all gas");
	} catch (err) {
		const errorMsg = (err + '').toLowerCase();
		assert.ok(testRpcTxFailedRegex.test(errorMsg) || gethTxFailedRegex.test(errorMsg), `Error should indicate tx failed: ${errorMsg}`);
	}
};

module.exports = assertTransactionFails;
