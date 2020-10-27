/* eslint-disable eqeqeq */

const _ = require('lodash')
const assert = require('assert')
const EthDater = require('ethereum-block-by-date')
const { web3 } = require('../utils/web3')
const ArbitrableTokenList = require('../assets/contracts/arbitrable-token-list.json')

module.exports = async (address, fromDate, toDate) => {
  // Initialize contracts
  const arbitrableTokenList = new web3.eth.Contract(
    ArbitrableTokenList,
    address
  )

  const dater = new EthDater(
    web3 // Web3 object, required.
  )

  const fromDateBlockPair = await dater.getDate(
    fromDate, // Date, required. Any valid moment.js value: string, milliseconds, Date() object, moment() object.
    true // Block after, optional. Search for the nearest block before or after the given date. By default true.
  )

  const toDateBlockPair = await dater.getDate(
    toDate, // Date, required. Any valid moment.js value: string, milliseconds, Date() object, moment() object.
    true // Block after, optional. Search for the nearest block before or after the given date. By default true.
  )

  console.log(
    `Calculating from block ${fromDateBlockPair.block} (${fromDateBlockPair.date}) to block ${toDateBlockPair.block} (${toDateBlockPair.date}).`
  )

  // REGISTRATION REQUESTS //
  const events = (await arbitrableTokenList.getPastEvents('TokenStatusChange', {
    fromBlock: fromDateBlockPair.block,
    toBlock: toDateBlockPair.block
  })).filter(events => events.returnValues._status == '2')
  console.log(
    `${events.length} TokenStatusChange events that request registration fetched, in given time frame.`
  )
  const distinctTokens = Object.keys(
    _.groupBy(events.map(e => e.returnValues._tokenID))
  )
  console.log(
    `These registration request events contain ${distinctTokens.length} distinct tokens.`
  )
  const tokenInfos = await Promise.all(
    distinctTokens.map(t => arbitrableTokenList.methods.getTokenInfo(t).call())
  )

  const registeredTokens = tokenInfos.filter(token => token.status == '1')
  console.log(
    `In the given time frame ${registeredTokens.length} tokens became registered.`
  )
  // console.log(registeredTokens.map(r => r.name).sort());

  const tokenSubmittedEvents = await arbitrableTokenList.getPastEvents(
    'TokenSubmitted',
    {
      fromBlock: 7303699, // KlerosLiquid Deployment
      toBlock: toDateBlockPair.block
    }
  )
  console.log(
    `${tokenSubmittedEvents.length} TokenSubmittedEvents emitted up till ${toDateBlockPair.block} (${toDateBlockPair.date}).`
  )

  const tokenSubmittedEventsOfRegisteredTokens = tokenSubmittedEvents.filter(
    e =>
      registeredTokens.find(
        element =>
          element.name == e.returnValues._name &&
          element.addr == e.returnValues._address &&
          element.symbolMultihash == e.returnValues._symbolMultihash &&
          element.ticker == e.returnValues._ticker
      )
  )
  console.log(
    `${tokenSubmittedEventsOfRegisteredTokens.length} of them belongs to registered tokens.`
  )

  const txHashes = tokenSubmittedEventsOfRegisteredTokens.map(
    event => event.transactionHash
  )

  const txs = await Promise.all(
    txHashes.map(hash => web3.eth.getTransaction(hash))
  )

  const fromAddresses = txs.map(tx => tx.from)

  const countPerAddress = _.countBy(fromAddresses)
  const sortedCountPerAddress = Object.entries(countPerAddress).sort(
    (a, b) => b[1] - a[1]
  )

  console.log(
    'Here is the number of successful new token submission for each requester:'
  )
  console.log(sortedCountPerAddress)

  // CLEARING REQUESTS //
  const removalEvents = (await arbitrableTokenList.getPastEvents(
    'TokenStatusChange',
    {
      fromBlock: fromDateBlockPair.block,
      toBlock: toDateBlockPair.block
    }
  )).filter(events => events.returnValues._status == '3')
  console.log(
    `${removalEvents.length} TokenStatusChange events that request clearing fetched, in given time frame.`
  )

  const removalDistinctTokens = Object.keys(
    _.groupBy(removalEvents.map(e => e.returnValues._tokenID))
  )
  console.log(
    `These clearing request events contain ${removalDistinctTokens.length} distinct tokens.`
  )

  const removalTokenInfos = await Promise.all(
    removalDistinctTokens.map(t =>
      arbitrableTokenList.methods.getTokenInfo(t).call()
    )
  )

  const removedTokens = removalTokenInfos.filter(token => token.status == '0')
  console.log(`${removedTokens.length} of them are removed.`)
  console.log(removedTokens.map(r => r.name).sort())
}
