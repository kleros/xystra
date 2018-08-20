const fs = require('fs')

const csv = require('csv')

const { web3, fetchList } = require('../utils/web3')
const ArbitrablePermissionList = require('../assets/contracts/arbitrable-permission-list.json')
const Kleros = require('../assets/contracts/kleros.json')

module.exports = async address => {
  // Initialize contracts
  const arbitrablePermissionList = new web3.eth.Contract(
    ArbitrablePermissionList.abi,
    address
  )
  const kleros = new web3.eth.Contract(
    Kleros.abi,
    await arbitrablePermissionList.methods.arbitrator().call()
  )
  console.info('Contracts initialized.')

  // Initialize file and rows
  const outStream = fs.createWriteStream(
    `./arbitrable-permission-list-${address}.csv`
  )
  const rows = [
    [
      'hash',
      'submitter',
      'status',
      'disputed',
      'lastAction',
      'nOfChallenges',
      'votes'
    ]
  ]

  // Fetch items list into batches
  const itemsList = await fetchList(arbitrablePermissionList.methods.itemsList)
  const itemBatches = []
  while (itemsList.length > 0) itemBatches.push(itemsList.splice(0, 5))
  console.info('Fetched items list.')

  // Fetch items
  const items = []
  for (const itemBatch of itemBatches)
    await Promise.all(
      itemBatch.map(hash =>
        arbitrablePermissionList.methods
          .items(hash)
          .call()
          .then(item => items.push({ ...item, hash }))
      )
    )
  console.info('Fetched items.')

  // Fetch disputeIDs
  const disputeIDs = {}
  for (const event of await arbitrablePermissionList.getPastEvents('Dispute', {
    fromBlock: 0
  })) {
    const itemHash = `0x${(await web3.eth.getTransaction(
      event.transactionHash
    )).input.slice(10)}`
    if (items.find(item => item.hash === itemHash))
      if (disputeIDs[itemHash])
        disputeIDs[itemHash].push(event.returnValues._disputeID)
      else disputeIDs[itemHash] = [event.returnValues._disputeID]
  }
  console.info('Fetched dispute IDs.')

  // Fetch votes and build rows
  for (const item of items) {
    item.votes = []
    if (disputeIDs[item.hash])
      for (const disputeID of disputeIDs[item.hash]) {
        const votes = []
        let appeal = 0
        while (true)
          try {
            votes.push(
              await Promise.all([
                kleros.methods.getVoteCount(disputeID, appeal, 1).call(),
                kleros.methods.getVoteCount(disputeID, appeal, 2).call()
              ])
            )
            appeal++
          } catch (err) {
            if (
              err.message.slice(0, "Couldn't decode".length) !==
              "Couldn't decode"
            )
              throw err
            break
          }
        item.votes.push(votes) // eslint-disable-line no-unreachable
      }
    console.info(`Fetched votes for item ${item.hash}.`)

    rows.push([
      item.hash,
      item.submitter,
      [
        'Absent', // The item has never been submitted.
        'Cleared', // The item has been submitted and the dispute resolution process determined it should not be added or a clearing request has been submitted and not contested.
        'Resubmitted', // The item has been cleared but someone has resubmitted it.
        'Registered', // The item has been submitted and the dispute resolution process determined it should be added or the submission was never contested.
        'Submitted', // The item has been submitted.
        'ClearingRequested', // The item is registered, but someone has requested to remove it.
        'PreventiveClearingRequested' // The item has never been registered, but someone asked to clear it preemptively to avoid it being shown as not registered during the dispute resolution process.
      ][item.status],
      item.disputed ? 'yes' : 'no',
      new Date(item.lastAction * 1000).toString(),
      item.votes.length,
      item.votes
    ])
  }

  // Write to file
  csv.stringify(rows).pipe(outStream)
  console.info('File saved.')
}
