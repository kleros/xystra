const fs = require('fs')
const _ = require('lodash')
const csv = require('csv')

const { web3 } = require('../utils/web3')
const KlerosLiquid = require('../assets/contracts/kleros-liquid.json')

module.exports = async address => {
  // Initialize contracts
  const klerosLiquid = new web3.eth.Contract(KlerosLiquid.abi, address)
  console.info('Contracts initialized.')

  // Initialize file and rows
  const outStream = fs.createWriteStream(
    `./kleros-liquid-set-stake-${address}.csv`
  )
  const rows = [['address', 'subcourtID', 'stake(PNK)', 'newTotalStake(PNK)']]

  const events = await klerosLiquid.getPastEvents('StakeSet', {
    fromBlock: 0
  })

  console.info(`${events.length} StakeSet events found.`)

  console.log(
    `Number of jurors staked to the court: ${
      Object.keys(
        _.countBy(
          events
            .filter(e => e.returnValues._newTotalStake > 0)
            .map(event => event.returnValues._address)
        )
      ).length
    }`
  )

  for (const event of events)
    rows.push([
      event.returnValues._address,
      event.returnValues._subcourtID,
      event.returnValues._stake / 1e18,
      event.returnValues._newTotalStake / 1e18
    ])

  // Write to file
  csv.stringify(rows).pipe(outStream)
  console.info('File saved.')
}
