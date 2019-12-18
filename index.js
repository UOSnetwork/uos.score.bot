require('dotenv').config()

const UosApi = require('./src/uos.api')
const AccountManager = require('./src/account.manager')
const BalanceManager = require('./src/balance.manager')
const UosScoreBot = require('./src/uos.score.bot')

const conn = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  debug: false
})

const api = new UosApi()
const accountManager= new AccountManager(conn)
const balanceManager = new BalanceManager(api)

const bot = new UosScoreBot(process.env.TOKEN)

bot.init(api, accountManager, balanceManager)

bot.start()
