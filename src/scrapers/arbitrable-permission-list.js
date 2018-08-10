const { web3, fetchList } = require('../utils/web3')
const ArbitrablePermissionList = require('../assets/contracts/arbitrable-permission-list.json')

module.exports = async address => {
  const arbitrablePermissionList = new web3.eth.Contract(
    ArbitrablePermissionList.abi,
    address
  )
  console.log(await fetchList(arbitrablePermissionList.methods.itemsList))
}
