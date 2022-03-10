const LINK = new Map();
LINK.set("43114", "0x5947bb275c521040051d82396192181b413227a3");

const LINK_PRICE_FEED = new Map();
LINK_PRICE_FEED.set("43114", "0x49ccd9ca821EfEab2b98c60dC60F518E765EDe9a");

module.exports = async function ({
  getChainId,
  getNamedAccounts,
  deployments,
}) {
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();
  if (!LINK.has(chainId)) {
    throw Error("No LINK on this chain");
  }

  const Gtroller = await ethers.getContract("Gtroller");
  const unitroller = await ethers.getContract("Unitroller");
  const gTroller = Gtroller.attach(unitroller.address);

  const interestRateModel = await ethers.getContract(
    "GovernanceInterestRateModel"
  );

  await deploy("JLinkDelegate", {
    from: deployer,
    log: true,
    deterministicDeployment: false,
    contract: "GCollateralCapXrc20Delegate",
  });
  const jLinkDelegate = await ethers.getContract("JLinkDelegate");

  const deployment = await deploy("JLinkDelegator", {
    from: deployer,
    args: [
      LINK.get(chainId),
      gTroller.address,
      interestRateModel.address,
      ethers.utils.parseUnits("2", 26).toString(),
      "Banker Joe Link",
      "jLINK",
      8,
      deployer,
      jLinkDelegate.address,
      "0x",
    ],
    log: true,
    deterministicDeployment: false,
    contract: "GCollateralCapXrc20Delegator",
  });
  await deployment.receipt;
  const jLinkDelegator = await ethers.getContract("JLinkDelegator");

  console.log("Supporting jLINK market...");
  await gTroller._supportMarket(jLinkDelegator.address, 1, {
    gasLimit: 2000000,
  });

  const priceOracle = await ethers.getContract("PriceOracleProxyUSD");
  console.log("Setting price feed source for jLINK");
  await priceOracle._setAggregators(
    [jLinkDelegator.address],
    [LINK_PRICE_FEED.get(chainId)]
  );

  const collateralFactor = "0.60";
  console.log("Setting collateral factor ", collateralFactor);
  await gTroller._setCollateralFactor(
    jLinkDelegator.address,
    ethers.utils.parseEther(collateralFactor)
  );

  const reserveFactor = "0.25";
  console.log("Setting reserve factor ", reserveFactor);
  await jLinkDelegator._setReserveFactor(
    ethers.utils.parseEther(reserveFactor)
  );
};

module.exports.tags = ["jLINK"];
module.exports.dependencies = [
  "Gtroller",
  "TripleSlopeRateModel",
  "PriceOracle",
];
