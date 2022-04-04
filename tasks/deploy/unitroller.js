const { task } = require("hardhat/config");
const { saveContractAddress } = require("../utils");
const addresses = require("../../contract-addresses.json");

const contractName = "Unitroller";

task("deploy-unitroller").setAction(async (taskArgs, { ethers }) => {
  const [deployer] = await ethers.getSigners();

  console.log(`Active network: ${network.name}, ${network.config.chainId}`);
  console.log(
    `Deploying ${contractName} contract with the account:`,
    deployer.address
  );

  const Unitroller = await hre.ethers.getContractFactory("Unitroller");
  const unitroller = await Unitroller.deploy();

  await unitroller.deployed();

  saveContractAddress(network.config.chainId, contractName, unitroller.address);

  console.log(`${contractName} deployed to address:`, unitroller.address);

  return unitroller
});
