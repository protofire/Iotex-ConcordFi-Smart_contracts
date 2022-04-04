const { task } = require("hardhat/config");
const { saveContractAddress, parseBN } = require("../utils");
const addresses = require("../../contract-addresses.json");
const conf = require("../../deploy-config.json");

task("deploy-xrc20-delegator")
  .addParam("token", "token symbol")
  .setAction(async (taskArgs, { ethers }) => {
    const contractName = "GXrc20Delegator";
    const [deployer] = await ethers.getSigners();

    console.log(
      `Deploying ${contractName} contract with the account:`,
      deployer.address
    );

    const constructorArguements = conf["Xrc20Delegator"][taskArgs.token];
    const underlying = constructorArguements["underlying_"];
    const initialExchangeRateMantissa = parseBN(
      constructorArguements["initialExchangeRateMantissa_"]
    );
    const name = constructorArguements["name"];
    const symbol = constructorArguements["symbol"];
    const decimals = constructorArguements["decimals"];
    const admin = constructorArguements["admin_"];
    const becomeImplementationData =
      constructorArguements["becomeImplementationData"];
    const comptroller = addresses[network.config.chainId]["Gtroller"];
    const interestRateModel =
      addresses[network.config.chainId][`JumpRateModelV2_${taskArgs.token}`];
    const cXrc20Delegate = addresses[network.config.chainId]["GXrc20Delegate"];

    const Xrc20Delegator = await hre.ethers.getContractFactory(contractName);

    const xrc20Delegator = await Xrc20Delegator.deploy(
      underlying,
      comptroller,
      interestRateModel,
      initialExchangeRateMantissa,
      name,
      symbol,
      decimals,
      admin,
      cXrc20Delegate,
      becomeImplementationData
    );

    await xrc20Delegator.deployed();

    saveContractAddress(
      network.config.chainId,
      contractName,
      xrc20Delegator.address
    );

    console.log(`${contractName} deployed to address:`, xrc20Delegator.address);

    return xrc20Delegator
  });
