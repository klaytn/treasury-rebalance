require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  networks: {
    baobab: {
      url: process.env.BAOBAB_URL || "https://api.baobab.klaytn.net:8651",
      chainId: 1001,
      gas: 80000000,
      gasPrice: 750000000000,
      accounts: [process.env.PRIVATE_KEY]
    },
    'cypress': {
      url: process.env.CYPRESS_URL || "https://klaytn-mainnet-rpc.allthatnode.com:8551",
      chainId: 8217,
      gas: 80000000,
      gasPrice: 750000000000,
      accounts: [process.env.PRIVATE_KEY],
    },
  }

};