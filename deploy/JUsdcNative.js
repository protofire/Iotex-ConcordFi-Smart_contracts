const USDC = new Map();
USDC.set("4", "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b");
USDC.set("43114", "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e");

const USDC_PRICE_FEED = new Map();
USDC_PRICE_FEED.set("4", "0xa24de01df22b63d23Ebc1882a5E3d4ec0d907bFB");
USDC_PRICE_FEED.set("43114", "0xF096872672F44d6EBA71458D74fe67F9a77a23B9");

module.exports = async function ({
  getChainId,
  getNamedAccounts,
  deployments,
}) {
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();
  const Gtroller = await ethers.getContract("Gtroller");
  const unitroller = await ethers.getContract("Unitroller");
  const gTroller = Gtroller.attach(unitroller.address);

  const interestRateModel = await ethers.getContract("StableInterestRateModel");

  await deploy("JUsdcNativeDelegate", {
    from: deployer,
    log: true,
    deterministicDeployment: false,
    contract: "GCollateralCapXrc20Delegate",
  });
  const jUsdcNativeDelegate = await ethers.getContract("JUsdcNativeDelegate");

  const deployment = await deploy("JUsdcNativeDelegator", {
    from: deployer,
    args: [
      USDC.get(chainId),
      gTroller.address,
      interestRateModel.address,
      ethers.utils.parseUnits("2", 14).toString(),
      "Banker Joe USD coin (Native)",
      "jUSDCNative",
      8,
      deployer,
      jUsdcNativeDelegate.address,
      "0x",
    ],
    log: true,
    deterministicDeployment: false,
    contract: "GCollateralCapXrc20Delegator",
  });
  await deployment.receipt;
  const jUsdcNativeDelegator = await ethers.getContract("JUsdcNativeDelegator");

  console.log("Supporting jUSDC market...");
  await gTroller._supportMarket(jUsdcNativeDelegator.address, 1, {
    gasLimit: 2000000,
  });

  const priceOracle = await ethers.getContract("PriceOracleProxyUSD");
  console.log("Setting price feed source for jUSDCNative");
  await priceOracle._setAggregators(
    [jUsdcNativeDelegator.address],
    [USDC_PRICE_FEED.get(chainId)]
  );

  const collateralFactor = "0.80";
  console.log("Setting collateral factor ", collateralFactor);
  await gTroller._setCollateralFactor(
    jUsdcNativeDelegator.address,
    ethers.utils.parseEther(collateralFactor)
  );

  const reserveFactor = "0.20";
  console.log("Setting reserve factor ", reserveFactor);
  await jUsdcNativeDelegator._setReserveFactor(
    ethers.utils.parseEther(reserveFactor)
  );

  const protocolSeizeShare = "0.016";
  console.log("Setting protocol seize share ", protocolSeizeShare);
  await jUsdcNativeDelegator._setProtocolSeizeShare(
    ethers.utils.parseEther(protocolSeizeShare)
  );
};

module.exports.tags = ["jUSDCNative"];
module.exports.dependencies = [
  "Gtroller",
  "TripleSlopeRateModel",
  "PriceOracle",
];
