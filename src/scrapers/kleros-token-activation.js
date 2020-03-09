const fs = require('fs')

const csv = require('csv')

const { fetchTransactions, web3 } = require('../utils/web3')
const Kleros = require('../assets/contracts/kleros.json')

module.exports = async address => {
  // Initialize contracts
  const kleros = new web3.eth.Contract(Kleros.abi, address)
  console.info('Contracts initialized.')

  // Initialize file and rows
  const outStream = fs.createWriteStream(
    `./kleros-token-activation-${address}.csv`
  )
  const rows = [['address', 'value', 'session']]

  // Fetch sessions
  const events = (await kleros.getPastEvents('NewPeriod', {
    fromBlock: 0
  })).filter(e => e.returnValues._period === '0')
  const sessions = []
  for (let i = 0; i < events.length; i++)
    sessions.push({
      session: i + 1,
      timeStamp: Number(
        (await web3.eth.getBlock(events[i].blockNumber)).timestamp
      )
    })
  console.info('Fetched sessions.')

  // Fetch transactions and build rows
  for (const transaction of await fetchTransactions(
    address,
    'activateTokens(uint256)'
  )) {
    let session = 0
    for (; session < sessions.length; session++)
      if (Number(transaction.timeStamp) < sessions[session].timeStamp) break

    rows.push([
      transaction.from,
      web3.utils
        .fromWei(web3.utils.toBN(`0x${transaction.input.slice(10)}`))
        .toString(),
      session
    ])
  }
  console.info('Fetched transactions.')

  // Write to file
  csv.stringify(rows).pipe(outStream)
  console.info('File saved.')
}
