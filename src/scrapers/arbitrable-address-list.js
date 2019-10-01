const _ = require('lodash')

const { web3 } = require('../utils/web3')
const arbitrableAddressList = require('../assets/contracts/arbitrable-address-list.json')

module.exports = async address => {
  // Initialize contracts
  const contract = new web3.eth.Contract(arbitrableAddressList, address)

  const bountyStart = new Date('3 June 2019').getTime() / 1000
  const bountyEnd = new Date('3 September 2019').getTime() / 1000

  const events = await contract.getPastEvents('AddressSubmitted', {
    fromBlock: 0
  })
  const addressStatuses = await Promise.all(
    events.map(event =>
      contract.methods.addresses(event.returnValues._address).call()
    )
  )

  const blockNumbers = events.map(event => event.blockNumber)
  const timestamps = await Promise.all(
    blockNumbers.map(
      async blocknumber => (await web3.eth.getBlock(blocknumber)).timestamp
    )
  )

  const filteredEvents = events.filter(function(_, index) {
    return (
      addressStatuses[index] === '1' &&
      timestamps[index] > bountyStart &&
      timestamps[index] < bountyEnd
    )
  })

  const txHashes = filteredEvents.map(event => event.transactionHash)
  const txs = await Promise.all(
    txHashes.map(hash => web3.eth.getTransaction(hash))
  )
  const fromAddresses = txs.map(tx => tx.from)

  console.log(
    `Addresses and number of accepted erc20 submissions between ${new Date(
      bountyStart * 1000
    )} and ${new Date(bountyEnd * 1000)}`
  )
  console.log(_.countBy(fromAddresses))
}
