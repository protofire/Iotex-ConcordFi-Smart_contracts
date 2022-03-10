// hardhat.config.ts

require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("hardhat-abi-exporter");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("hardhat-spdx-license-identifier");
require("hardhat-watcher");
require("hardhat-contract-sizer");
require("hardhat-storage-layout-diff");
require("@openzeppelin/hardhat-upgrades");

require("./tasks/deploy");

const { HardhatUserConfig } = require("hardhat/types");
const { removeConsoleLog } = require("hardhat-preprocessor");

const accounts = [`0x${process.env.PK}`];

module.exports = {
  abiExporter: {
    path: "./abi",
    clear: false,
    flat: true,
    // only: [],
    // except: []
  },
  defaultNetwork: "hardhat",
  mocha: {
    timeout: 20000,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    dev: {
      // Default to 1
      default: 0,
    },
    treasury: {
      default: 1,
    },
    investor: {
      default: 2,
    },
  },
  networks: {
    mainnet: {
      url: "https://babel-api.mainnet.iotex.io/",
      accounts,
      gasPrice: 120 * 1000000000,
      chainId: 4689,
    },
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ["local"],
    },
    hardhat: {
      forking: {
        enabled: true,
        url: `https://api.avax.network/ext/bc/C/rpc`,
        blockNumber: 7328000,
      },
      live: false,
      saveDeployments: true,
      tags: ["test", "local"],
    },
    testnet: {
      url: "https://babel-api.testnet.iotex.io",
      accounts,
      chainId: 4690,
      live: true,
      saveDeployments: true,
      tags: ["staging"],
      gas: "auto",
    },
  },
  paths: {
    artifacts: "artifacts",
    cache: "cache",
    deploy: "deploy",
    deployments: "deployments",
    imports: "imports",
    sources: "contracts",
    tests: "test",
  },
  preprocess: {
    eachLine: removeConsoleLog(
      (bre) =>
        bre.network.name !== "hardhat" && bre.network.name !== "localhost"
    ),
  },
  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  spdxLicenseIdentifier: {
    overwrite: false,
    runOnCompile: true,
  },
  watcher: {
    compile: {
      tasks: ["compile"],
      files: ["./contracts"],
      verbose: true,
    },
  },
};
