const { task } = require("hardhat/config");
const { saveContractAddress, parseBN } = require("../utils");
const addresses = require("../../contract-addresses.json");
const conf = require("../../deploy-config.json");

task("deploy-xrc20-cap")
.addParam("token", "token symbol")
.setAction(async (taskArgs, { ethers }) => {
  const contractName = "GCollateralCapXrc20";
  const [deployer] = await ethers.getSigners();

  console.log(
    `Deploying ${contractName} contract with the account:`,
    deployer.address
  );

  const GCollateralCapXrc20 = await ethers.getContractFactory(contractName);
  const gCollateralCapXrc20 = await GCollateralCapXrc20.deploy();

  console.log(`${contractName} deployed to address:`, gCollateralCapXrc20.address);

  const constructorArguements = conf["Xrc20Delegator"][taskArgs.token];
  const underlying = constructorArguements["underlying_"];
  const initialExchangeRateMantissa = parseBN(
    constructorArguements["initialExchangeRateMantissa_"]
  );
  const name = constructorArguements["name"];
  const symbol = constructorArguements["symbol"];
  const decimals = constructorArguements["decimals"];
  const comptroller = addresses[network.config.chainId]["Gtroller"];
  const interestRateModel =
    addresses[network.config.chainId][`JumpRateModelV2_${taskArgs.token}`];

  // console.log("Initializing contract...", gCollateralCapXrc20)
  // await(await gCollateralCapXrc20.initialize(underlying, comptroller, interestRateModel, initialExchangeRateMantissa, name, symbol, decimals)).wait(3);

  saveContractAddress(
    network.config.chainId,
    `${contractName}_${taskArgs.token}`,
    gCollateralCapXrc20.address
  );

  return gCollateralCapXrc20
});
