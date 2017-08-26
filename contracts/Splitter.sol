pragma solidity ^0.4.4;

contract Splitter {
	struct Recipients {
		address a;
		address b;
	}

	event SetRecipients(address indexed funder, address indexed recipientA, address indexed recipientB);
	event DisburseFunds(address indexed funder, address indexed recipientA, address indexed recipientB, uint valueDisbursedToEachRecipient);

	mapping(address => Recipients) recipients;

	function Splitter(){}

	function setRecipients(address recipientA, address recipientB)
		public
	{
		// Addresses must be non-zero
		require(recipientA != 0x0);
		require(recipientB != 0x0);
		// Recipients must be distinct addresses
		require(recipientA != recipientB);
		// Sender cannot also be a recipient
		require(msg.sender != recipientA);
		require(msg.sender != recipientB);

		// Check passed, update our state
		recipients[msg.sender] = Recipients(recipientA, recipientB);
		SetRecipients(msg.sender, recipientA, recipientB);
	}

	function disburseFunds()
		public
		payable
	{
		// Value must be even and greater than 0
		require(msg.value > 0);
		require(msg.value % 2 == 0);
		// Recipients must be set already
		Recipients storage disbursees = recipients[msg.sender];
		require(disbursees.a != 0x0);
		require(disbursees.b != 0x0);

		uint splitValue = msg.value / 2;
		disbursees.a.transfer(splitValue);
		disbursees.b.transfer(splitValue);
		DisburseFunds(msg.sender, disbursees.a, disbursees.b, splitValue);
	}
}