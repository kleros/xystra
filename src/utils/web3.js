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
    } catch (err) {
      if (err.message.slice(0, "Couldn't decode".length) !== "Couldn't decode")
        throw err
      return list
    }
}
