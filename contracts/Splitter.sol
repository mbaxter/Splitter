pragma solidity ^0.4.4;

import "./Owned.sol";

contract Splitter is Owned {
	struct Recipients {
	address a;
	address b;
	}

	event LogSendFunds(address sender, uint funds);
	event LogWithdrawal(address recipient, uint amount);

	Recipients public recipients;

	mapping(address => uint) public balance;

	function setRecipients(address recipientA, address recipientB)
		assertFromOwner
	{
		//Addresses must be non-zero
		require(recipientA != 0x0);
		require(recipientB != 0x0);
		// Recipients must be distinct addresses
		require(recipientA != recipientB);
		// Sender cannot also be a recipient
		require(msg.sender != recipientA);
		require(msg.sender != recipientB);
		// This contract cannot be a recipient
		require(this != recipientA);
		require(this != recipientB);

		// Check passed, update our state
		recipients.a = recipientA;
		recipients.b = recipientB;
	}

	function withdrawFunds()
		public
		returns (bool success)
	{
		// Sender must have a positive balance
		require(balance[msg.sender] > 0);

		uint amount = balance[msg.sender];
		// Update state
		balance[msg.sender] = 0;

		// Send refund
		msg.sender.transfer(amount);

		LogWithdrawal(msg.sender, amount);
		return true;
	}

	function sendFunds()
		public
		payable
		assertFromOwner()
	{
		// Recipients must be set
		require(recipients.a != 0);
		require(recipients.b != 0);
	
		// Must send enough value to split
		require(msg.value >= 2);

		// Refund sender if value cannot be evenly split
		if (msg.value % 2 == 1) {
			balance[msg.sender] += 1;
		}

		// Update balance
		uint splitAmount = msg.value / 2;
		balance[recipients.a] += splitAmount;
		balance[recipients.b] += splitAmount;

		// Emit events
		LogSendFunds(msg.sender, msg.value);
	}

	// Disable fallback
	function() {
		assert(false);
	}
}