require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });

const { task } = require("hardhat/config");
const { parseBN } = require("../utils");
const addresses = require("../../contract-addresses.json");
const ABI = require("../SimpleOracle.json")

const RPC_URL = process.env.RPC_URL === "development" ? "https://babel-api.testnet.iotex.io/" : "https://babel-api.mainnet.iotex.io/";

task("deploy-concordfi").setAction(async (taskArgs, { run, ethers }) => {
  const [deployer] = await ethers.getSigners();

  const gtroller = await run("deploy-gtroller")

  const unitroller = await run("deploy-unitroller")

 await run("deploy-maximillion")

 await run("deploy-jump-rate-model-v2", { 
    token: "USDT"
  })

  await run("deploy-jump-rate-model-v2", { 
    token: "IOTX"
  })

  const giotx = await run("deploy-giotx")

  const xrc20Delegate = await run("deploy-xrc20-delegate")

  const xrc20Delegator = await run("deploy-xrc20-delegator", { token: "USDT"})


  // setting market prices
  const oracle =
  addresses[network.config.chainId]["Oracle"];

  const signer = new ethers.Wallet(process.env.PK) 
  const signer_provider = await signer.connect(new ethers.providers.JsonRpcProvider(RPC_URL));
  const oracleContract = new ethers.Contract(oracle, ABI, signer_provider)

  console.log("Setting underlying prices...: ", [giotx.address, xrc20Delegator.address]);
  await(await oracleContract.setUnderlyingPrice([giotx.address, xrc20Delegator.address], [parseBN("0.1015"), parseBN("1")])).wait(3)

  // Configure Grroller contract
  console.log('Configuring deployments...: ', oracleContract)
  await(await(await unitroller._setPendingImplementation(gtroller.address))).wait(3);

  console.log("oracle: ", oracle)

  await(await gtroller._become(unitroller.address)).wait(3);

  await(await gtroller._setPriceOracle(oracle)).wait(3);

  await(await gtroller._setLiquidationIncentive(parseBN("1.1"))).wait(3);

  await(await gtroller._supportMarket(xrc20Delegator.address, 1)).wait(3);
  await(await gtroller._supportMarket(giotx.address, 1)).wait(3);
  console.log('HERE parseBN(0.7): ', parseBN("0.7"))

  await(await gtroller._setCollateralFactor(giotx.address, parseBN("0.7"))).wait(3);
  console.log("FAIL...")
  await(await gtroller._setCollateralFactor(xrc20Delegator.address, parseBN("0.85"))).wait(3);

  // Configure markets
  await(await giotx._setReserveFactor(parseBN("0.5"))).wait(3);

  await(await xrc20Delegator._setReserveFactor(parseBN("0.3"))).wait(3);

  console.log("❤⭕");
});
