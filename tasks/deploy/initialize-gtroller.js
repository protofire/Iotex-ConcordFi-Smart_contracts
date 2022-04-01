const { task } = require("hardhat/config");
const { saveContractAddress } = require("../utils");

task("deploy-comptroller").setAction(async (taskArgs, { ethers }) => {
  const contractName = "Gtroller";

  console.log("Deploying comptroller");
  const Gtroller = await ethers.getContractFactory(contractName);
  const gtroller = await Gtroller.deploy();

  console.log(`Gtroller token deployed to ${gtroller.address}`);
  saveContractAddress(network.config.chainId, contractName, gtroller.address);
});
