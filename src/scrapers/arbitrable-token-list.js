const _ = require('lodash')
const assert = require('assert')

const { web3 } = require('../utils/web3')
const ArbitrableTokenList = require('../assets/contracts/arbitrable-token-list.json')

module.exports = async address => {
  // Initialize contracts
  const arbitrableTokenList = new web3.eth.Contract(
    ArbitrableTokenList,
    address
  )

  const events = await arbitrableTokenList.getPastEvents('TokenStatusChange', {
    fromBlock: 0
  })

  const onlySubmitted = _.filter(events, function(event) {
    return event.returnValues[3] === 1
  })
  const onlySubmittedTokenIDs = Object.keys(
    _.groupBy(onlySubmitted.map(e => e.returnValues[2]))
  )

  const tokenInfos = await Promise.all(
    onlySubmittedTokenIDs.map(t =>
      arbitrableTokenList.methods.getTokenInfo(t).call()
    )
  )
  const registeredTokens = tokenInfos.filter(token => token.status === 1)
  const registeredTokensSymbols = registeredTokens.map(r => r.symbolMultihash)

  console.log(`Number of registeredTokens: ${registeredTokens.length}`)

  const tokenSubmittedEvents = await arbitrableTokenList.getPastEvents(
    'TokenSubmitted',
    {
      fromBlock: 0
    }
  )

  const tokenSubmittedEventsOfRegisteredTokens = tokenSubmittedEvents.filter(
    e => registeredTokensSymbols.includes(e.returnValues._symbolMultihash)
  )

  const lastTokenSubmittedEventsOfRegisteredTokens = tokenSubmittedEventsOfRegisteredTokens.reduce(
    function(acc, cur) {
      const search = acc.findIndex(
        e =>
          e.returnValues._symbolMultihash === cur.returnValues._symbolMultihash
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

  assert.strictEqual(
    fromAddresses.length,
    registeredTokens.length,
    "Number of registered tokens doesn't match number of eligible transactions."
  )

  console.log(_.countBy(fromAddresses))
}
