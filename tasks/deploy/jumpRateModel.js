const { task } = require("hardhat/config");
const { saveContractAddress, parseBN } = require("../utils");
const config = require("../../deploy-config.json");

task("deploy-jump-rate-model-v2")
  .addParam("token", "token symbol")
  .setAction(async (taskArgs, { ethers }) => {
    const [deployer] = await ethers.getSigners();

    const contractName = "JumpRateModelV2";

    console.log(
      `Deploying ${contractName} contract with the account:`,
      deployer.address
    );

    const constructorArguements = config["JumpRateModelV2"][taskArgs.token];
    let baseRatePerYear = constructorArguements["baseRatePerYear"];
    baseRatePerYear = parseBN(baseRatePerYear);

    let multiplierPerYear = constructorArguements["multiplierPerYear"];
    multiplierPerYear = parseBN(multiplierPerYear);

    let jumpMultiplierPerYear = constructorArguements["jumpMultiplierPerYear"];
    jumpMultiplierPerYear = parseBN(jumpMultiplierPerYear);

    let kink = constructorArguements["kink"];
    kink = parseBN(kink);

    let roof = constructorArguements["roof"];
    roof = parseBN(roof);

    const owner = deployer.address;

    const JumpRateModelV2 = await ethers.getContractFactory(contractName);
    const jumpRateModelV2 = await JumpRateModelV2.deploy(
      baseRatePerYear,
      multiplierPerYear,
      jumpMultiplierPerYear,
      kink,
      roof,
      owner
    );

    console.log(
      `${contractName}_${taskArgs.token} deployed to address:`,
      jumpRateModelV2.address
    );

    saveContractAddress(
      network.config.chainId,
      `${contractName}_${taskArgs.token}`,
      jumpRateModelV2.address
    );

    return jumpRateModelV2
  });
