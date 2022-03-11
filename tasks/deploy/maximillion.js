const { task } = require("hardhat/config");
const { saveContractAddress } = require("../utils");
const addresses = require("../../contract-addresses.json");

task("deploy-maximillion").setAction(async (taskArgs, { ethers }) => {
  const contractName = "Maximillion";
  const [deployer] = await ethers.getSigners();

  console.log(
    `Deploying ${contractName} contract with the account:`,
    deployer.address
  );

  const gIotx = addresses[network.config.chainId]["GIotx"];

  const Maximillion = await ethers.getContractFactory(contractName);
  const maximillion = await Maximillion.deploy(gIotx);

  console.log(`${contractName} deployed to address:`, maximillion.address);

  saveContractAddress(
    network.config.chainId,
    contractName,
    maximillion.address
  );
});
