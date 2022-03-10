module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  await deploy("Unitroller", {
    from: deployer,
    log: true,
    deterministicDeployment: false,
  });
  const unitroller = await ethers.getContract("Unitroller");

  await deploy("Gtroller", {
    from: deployer,
    log: true,
    deterministicDeployment: false,
  });
  const Gtroller = await ethers.getContract("Gtroller");

  console.log("Setting Gtroller as implementation of Unitroller...");
  const deployment = await unitroller._setPendingImplementation(
    Gtroller.address
  );
  await deployment.receipt;
  await Gtroller._become(unitroller.address);
  await deployment.receipt;

  const gTroller = Gtroller.attach(unitroller.address);

  const closeFactor = "0.5";
  console.log("Setting close factor of ", closeFactor);
  await gTroller._setCloseFactor(ethers.utils.parseEther(closeFactor));

  const liquidationIncentive = "1.08";
  console.log("Setting liquidation incentive of ", liquidationIncentive);
  await gTroller._setLiquidationIncentive(
    ethers.utils.parseEther(liquidationIncentive)
  );

  const priceOracle = await ethers.getContract("PriceOracleProxyUSD");
  console.log("Setting price oracle ", priceOracle.address);
  await gTroller._setPriceOracle(priceOracle.address);

  const rewardDistributor = await ethers.getContract("RewardDistributor");
  console.log("Setting reward distributor", rewardDistributor.address);
  await gTroller._setRewardDistributor(rewardDistributor.address);
};

module.exports.tags = ["Gtroller"];
module.exports.dependencies = [
  "PriceOracle",
  "TripleSlopeRateModel",
  "RewardDistributor",
];
