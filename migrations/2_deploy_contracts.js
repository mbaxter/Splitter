const Splitter = artifacts.require("./Splitter.sol");

module.exports = function(deployer, network, accounts) {
	if (accounts.length < 3) {
		throw new Error("At least 3 available accounts must be available in order to deploy");
	}
	deployer.deploy(Splitter, accounts[1], accounts[2]);
};
