const { task } = require("hardhat/config");
const { saveContractAddress, parseBN } = require("../utils");
const addresses = require("../../contract-addresses.json");
const conf = require("../../deploy-config.json");

task("deploy-giotx").setAction(async (taskArgs, { ethers }) => {
  const contractName = "GIotx";
  const [deployer] = await ethers.getSigners();

  console.log(
    `Deploying ${contractName} contract with the account:`,
    deployer.address
  );

  const constructorArguements = conf["gIOTX"];
  const initialExchangeRateMantissa = parseBN(
    constructorArguements["initialExchangeRateMantissa_"]
  );
  const name = constructorArguements["name"];
  const symbol = constructorArguements["symbol"];
  const decimals = constructorArguements["decimals"];
  const admin = constructorArguements["admin_"];
  const comptroller = addresses[network.config.chainId]["Gtroller"];
  const interestRateModel =
    addresses[network.config.chainId]["JumpRateModelV2_IOTX"];

  const GIotx = await hre.ethers.getContractFactory(contractName);

  const gIotx = await GIotx.deploy(
    comptroller,
    interestRateModel,
    initialExchangeRateMantissa,
    name,
    symbol,
    decimals,
    admin
  );

  await gIotx.deployed();

  saveContractAddress(
    network.config.chainId,
    contractName,
    gIotx.address
  );

  console.log(`${contractName} deployed to address:`, gIotx.address);
});
