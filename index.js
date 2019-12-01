#!/usr/bin/env node
const commander = require('commander')

const scrapeKlerosTokenActivation = require('./src/scrapers/kleros-token-activation')
const scrapeArbitrablePermissionList = require('./src/scrapers/arbitrable-permission-list')
const scrapeKlerosLiquidSetStake = require('./src/scrapers/kleros-liquid-set-stake')
const scrapeArbitrableTokenList = require('./src/scrapers/arbitrable-token-list')
const scrapeArbitrableAddressList = require('./src/scrapers/arbitrable-address-list')

// Validation
const validateETHAddress = address => {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address))
    throw new Error('Invalid ETH address.')
  return true
}

// Globals
commander.version(require('./package.json').version)

// Kleros Token Activation
commander
  .command('kleros-token-activation <address>')
  .action(
    address =>
      validateETHAddress(address) && scrapeKlerosTokenActivation(address)
  )

// Arbitrable Permission List
commander
  .command('arbitrable-permission-list <address>')
  .action(
    address =>
      validateETHAddress(address) && scrapeArbitrablePermissionList(address)
  )

// Kleros Liquid Set Stake
commander
  .command('kleros-liquid-set-stake <address>')
  .action(
    address =>
      validateETHAddress(address) && scrapeKlerosLiquidSetStake(address)
  )

commander
  .command('arbitrable-token-list <address> <date>')
  .action(
    (address, date) =>
      validateETHAddress(address) && scrapeArbitrableTokenList(address, date)
  )

commander
  .command('arbitrable-address-list <address> <date>')
  .action(
    (address, date) =>
      validateETHAddress(address) && scrapeArbitrableAddressList(address, date)
  )

// Handle unknown commands
commander.on('command:*', () => {
  console.error(
    `\nInvalid command: "${commander.args.join(
      ' '
    )}".\nSee --help for a list of available commands.\n`
  )
  process.exit(1)
})

// Run
commander.parse(process.argv)

// Require command
if (commander.args.length === 0) commander.help()
