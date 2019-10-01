const _ = require('lodash')

const { web3 } = require('../utils/web3')
const ArbitrableTokenList = require('../assets/contracts/arbitrable-token-list.json')

module.exports = async address => {
  // Initialize contracts
  const arbitrableTokenList = new web3.eth.Contract(
    ArbitrableTokenList,
    address
  )

  const txHashes = (await arbitrableTokenList.getPastEvents('TokenSubmitted', {
    fromBlock: 0
  })).map(event => event.transactionHash)

  const txs = await Promise.all(
    txHashes.map(hash => web3.eth.getTransaction(hash))
  )
  const fromAddresses = txs.map(tx => tx.from)
  console.log(fromAddresses)

  console.log(_.countBy(fromAddresses))
}
