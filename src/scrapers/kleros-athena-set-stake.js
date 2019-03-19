const fs = require('fs')

const csv = require('csv')

const { web3 } = require('../utils/web3')
const KlerosLiquid = require('../assets/contracts/kleros-liquid.json')

module.exports = async address => {
  // Initialize contracts
  const kleros = new web3.eth.Contract(KlerosLiquid.abi, address)
  console.info('Contracts initialized.')

  // Initialize file and rows
  const outStream = fs.createWriteStream(
    `./kleros-athena-set-stake-${address}.csv`
  )
  const rows = [['address', 'subcourtID', 'stake', 'newTotalStake']]

  const events = await kleros.getPastEvents('StakeSet', {
    fromBlock: 0
  })

  console.log(events)

  console.info(`${events.length} StakeSet event found.`)

  // const transactions = await fetchTransactions(
  //   address,
  //   'setStake(uint96,uint128)'
  // )
  //
  // console.info(`${transactions.length} transactions found.`)

  for (const event of events)
    rows.push([
      event.returnValues._address,
      event.returnValues._subcourtID,
      event.returnValues._stake,
      event.returnValues._newTotalStake
    ])

  // Write to file
  csv.stringify(rows).pipe(outStream)
  console.info('File saved.')
}
