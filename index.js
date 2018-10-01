#!/usr/bin/env node
const commander = require('commander')

const scrapeKlerosTokenActivation = require('./src/scrapers/kleros-token-activation')
const scrapeArbitrablePermissionList = require('./src/scrapers/arbitrable-permission-list')

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
