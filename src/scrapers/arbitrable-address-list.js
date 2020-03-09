const _ = require('lodash')
const assert = require('assert')
const EthDater = require('ethereum-block-by-date')
const { web3 } = require('../utils/web3')
const ArbitrableAddressList = require('../assets/contracts/arbitrable-address-list.json')

module.exports = async (address, date) => {
  // Initialize contracts
  const arbitrableAddressList = new web3.eth.Contract(
    ArbitrableAddressList,
    address
  )

  const dater = new EthDater(
    web3 // Web3 object, required.
  )

  const dateBlockPair = await dater.getDate(
    date, // Date, required. Any valid moment.js value: string, milliseconds, Date() object, moment() object.
    true // Block after, optional. Search for the nearest block before or after the given date. By default true.
  )

  const events = await arbitrableAddressList.getPastEvents(
    'AddressStatusChange',
    {
      filter: {
        status: '1'
      },
      fromBlock: dateBlockPair.block
    }
  )
  console.log(`${events.length} AddressStatusChange events fetched.`)
  const onlySubmittedAddresses = Object.keys(
    _.groupBy(events.map(e => e.returnValues[2]))
  )

  const tokenInfos = await Promise.all(
    onlySubmittedAddresses.map(t =>
      arbitrableAddressList.methods.getAddressInfo(t).call()
    )
  )

  const submittedAddressesWithInfos = _.zipObject(
    onlySubmittedAddresses,
    tokenInfos
  )

  Object.filter = (obj, predicate) =>
    Object.assign(
      ...Object.keys(obj)
        .filter(key => predicate(obj[key]))
        .map(key => ({ [key]: obj[key] }))
    )

  var registeredAddressesWithInfos = Object.filter(
    submittedAddressesWithInfos,
    result => result.status === '1'
  )
  console.log('getAddressInfo calls made.')

  console.log(
    `Number of registeredAddresses: ${
      Object.keys(registeredAddressesWithInfos).length
    }`
  )

  const tokenSubmittedEvents = await arbitrableAddressList.getPastEvents(
    'AddressSubmitted',
    {
      fromBlock: dateBlockPair.block
    }
  )
  console.log('addressSubmitted events fetched.')

  const tokenSubmittedEventsOfRegisteredTokens = tokenSubmittedEvents.filter(
    e =>
      Object.keys(registeredAddressesWithInfos).includes(
        e.returnValues._address
      )
  )

  const lastTokenSubmittedEventsOfRegisteredTokens = tokenSubmittedEventsOfRegisteredTokens.reduce(
    function(acc, cur) {
      const search = acc.findIndex(
        e => e.returnValues._address === cur.returnValues._address
      )
      if (search === -1) return acc.concat(cur)
      else {
        if (acc[search].blockNumber < cur.blockNumber) acc[search] = cur
        return acc
      }
    },
    []
  )

  const txHashes = lastTokenSubmittedEventsOfRegisteredTokens.map(
    event => event.transactionHash
  )

  const txs = await Promise.all(
    txHashes.map(hash => web3.eth.getTransaction(hash))
  )

  const fromAddresses = txs.map(tx => tx.from)

  console.log(_.countBy(fromAddresses))
  assert.strictEqual(
    fromAddresses.length,
    Object.keys(registeredAddressesWithInfos).length,
    `Number of registered addresses ${
      Object.keys(registeredAddressesWithInfos).length
    } doesn't match number of eligible transactions ${fromAddresses.length}.`
  )
}
