const Web3 = require('web3')

module.exports.web3 = new Web3(
  new Web3.providers.HttpProvider(process.env.ETHEREUM_PROVIDER)
)

module.exports.fetchList = async method => {
  const list = []
  let i = 0
  while (true)
    try {
      list.push(await method(i++).call())
      console.log(`Fetched list item #${i}.`)
    } catch (err) {
      if (err.message.slice(0, "Couldn't decode".length) !== "Couldn't decode")
        throw err
      return list
    }
}

module.exports.getTransactions = async (address, functionSignature) => {
  const functionSignatureHash = module.exports.web3.utils.keccak256(
    functionSignature
  )

  const transactions = []
  const pageSize = 10000
  let page = 0
  let lastNumberOfResults = 0
  while (lastNumberOfResults === pageSize || page === 0) {
    const results = (await (await fetch(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${pageSize}&sort=asc&apikey=${
        process.env.ETHERSCAN_API_KEY
      }`
    )).json()).result

    lastNumberOfResults = results.length
    transactions.push(...results)
    page++
  }

  return transactions.filter(
    t =>
      t.input.slice(0, functionSignatureHash.length) === functionSignatureHash
  )
}
