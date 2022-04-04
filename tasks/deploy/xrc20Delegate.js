const { task } = require("hardhat/config");
const { saveContractAddress } = require("../utils");

task("deploy-xrc20-delegate").setAction(async (taskArgs, { ethers }) => {
  const contractName = "GXrc20Delegate";
  const [deployer] = await ethers.getSigners();

  console.log(
    `Deploying ${contractName} contract with the account:`,
    deployer.address
  );

  const Xrc20Delegate = await hre.ethers.getContractFactory(contractName);
  const xrc20Delegate = await Xrc20Delegate.deploy();

  await xrc20Delegate.deployed();

  saveContractAddress(
    network.config.chainId,
    contractName,
    xrc20Delegate.address
  );

  console.log(`${contractName} deployed to address:`, xrc20Delegate.address);
  return xrc20Delegate
});
