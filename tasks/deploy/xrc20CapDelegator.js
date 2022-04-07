const { task } = require("hardhat/config");
const { saveContractAddress, parseBN } = require("../utils");
const addresses = require("../../contract-addresses.json");
const conf = require("../../deploy-config.json");

task("deploy-xrc20-cap-delegator")
  .addParam("token", "token symbol")
  .setAction(async (taskArgs, { ethers }) => {
    const contractName = "GCollateralCapXrc20Delegator";
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
    const implementation = addresses[network.config.chainId]["GXrc20Delegate"];
      console.log("implementation: ", implementation)

    const GCollateralCapXrc20Delegator = await hre.ethers.getContractFactory(contractName);
      console.log("NEXT...")
      const options = {
        gasPrice: ethers.utils.parseUnits('100', 'gwei'),
        gasLimit: 5000000
      };

    const gCollateralCapXrc20Delegator = await GCollateralCapXrc20Delegator.deploy(
      underlying,
      comptroller,
      interestRateModel,
      initialExchangeRateMantissa,
      name,
      symbol,
      decimals,
      admin,
      implementation,
      becomeImplementationData
    );

    await gCollateralCapXrc20Delegator.deployed();

    saveContractAddress(
      network.config.chainId,
      contractName,
      gCollateralCapXrc20Delegator.address
    );

    console.log(`${contractName} deployed to address:`, gCollateralCapXrc20Delegator.address);

    return gCollateralCapXrc20Delegator
  });
