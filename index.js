require('dotenv').config()

const AccountManager = require('./src/account-manager')
const UosApi = require('./src/uos-api')
const UosScoreBot = require('./src/uos-score-bot')

const conn = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  debug: false
})

const manager = new AccountManager(conn)
const api = new UosApi()

const bot = new UosScoreBot(process.env.TOKEN, manager, api)

bot.init(manager, api)

bot.start()
