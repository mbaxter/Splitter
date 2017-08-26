Purpose
===

This is a simple practice project put together while learning Solidity.

Problem Description
===
Build a "Splitter" contract to support the following scenario:  
* There are 3 people: Alice, Bob and Carol.
* We can see the balance of the Splitter contract on the web page.
* Whenever Alice sends ether to the contract, half of it goes to Bob and the other half to Carol.
* We can see the balances of Alice, Bob and Carol on the web page.
* We can send ether to it from the web page.

Additional requirements:
* Contract should be a utility that can be used by David, Emma and anybody with an address.

Technology
===
This contract was built for deployment on the ethereum network using [Truffle](http://truffleframework.com/).