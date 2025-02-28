const { task } = require("hardhat/config");
const { saveContractAddress } = require("../utils");

task("deploy-rewardDistributor").setAction(async (taskArgs, { ethers }) => {
  const contractName = "RewardDistributor";

  console.log("Deploying RewardDistributor");
  const RewardDistributor = await ethers.getContractFactory(contractName);
  const options = {
    gasPrice: ethers.utils.parseUnits('500', 'gwei'),
    gasLimit: 11000000
  };

  const rewardDistributor = await RewardDistributor.deploy();

  console.log(`RewardDistributor token deployed to ${rewardDistributor.address}`);
  saveContractAddress(network.config.chainId, contractName, rewardDistributor.address);

  return rewardDistributor;
});
