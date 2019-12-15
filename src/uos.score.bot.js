require('dotenv').config()

const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const commandParts = require('telegraf-command-parts')

const assert = require('assert')
const AssertionError = require('assert').AssertionError

const EosioToken = require('./eosio.token')

module.exports = class UosScoreBot {
  constructor (token, params) {
    this.token = token

    this.initialized = false

    if (params) {
      this.telegraf = new Telegraf(this.token, params)
    } else {
      this.telegraf = new Telegraf(this.token)
    }

    if (process.env.NODE_ENV === 'development') {
      this.telegraf.use(Telegraf.log())
    }

    this.telegraf.use(commandParts())
  }

  async introMessage (ctx) {
    await ctx.replyWithMarkdown(`
I can help you to know the score of UOS Network accounts.

*Bot Commands*

/link <UOS account name> - Links your telegram account to specified UOS account

/unlink - Unlinks your telegram account from any linked UOS accounts

/check <Telegram/UOS account name> - Check the score of any telegram account (starting with @) or UOS account, sending this command without arguments shows your own score

!score <Telegram/UOS account name> - Same as above, doesn't work without argument

/balance - Check the balance of your telegram account (accounts should be linked using /link command)

[❤❤❤ Join bot community! ❤❤❤](https://u.community/communities/245)`, Extra.webPreview(false))
  }

  async linkCommand (that, ctx) {
    try {
      const uosName = ctx.state.command.args
      const tgName = ctx.message.from.username

      if (uosName && uosName.length === 12) {
        const uosAccount = await that.api.getUosAccountScore(uosName)

        if (uosAccount && Object.entries(uosAccount).length !== 0) {
          const linkedAccount = await that.manager.getAccountByTelegramId(ctx.message.from.id)

          if (!linkedAccount) {
            try {
              const uosAccountDetails = JSON.parse(await that.api.getUosAccountDetails(uosName))

              if (uosAccountDetails && Object.entries(uosAccountDetails).length !== 0) {
                let found = false

                const pattern = new RegExp(/^https:\/\/t.me\/(\w+)$/g)

                for (const source of uosAccountDetails.usersSources) {
                  const test = pattern.exec(source.sourceUrl)
                  if (test && test.length > 0 && test[1] === tgName) {
                    found = true
                  }
                }

                if (found) {
                  const result = await that.manager.addAccount({
                    tg_uid: ctx.message.from.id,
                    tg_name: tgName,
                    uos_name: uosName
                  })
                  await ctx.replyWithMarkdown(`Your telegram account @${result.tg_name} linked to UOS account ${that.manager.uosAccountMarkdownName(result.uos_name)}.`)
                } else {
                  await ctx.replyWithMarkdown(`${process.env.ACCOUNT_HELP_LINK}`)
                }
              } else {
                await ctx.replyWithMarkdown(`UOS account details for ${that.manager.uosAccountMarkdownLink(uosName)} not found, please register on U°Community platform to use this service.`)
              }
            } catch (e) {
              console.error(e)
              await ctx.replyWithMarkdown(`ERROR parsing your UOS account data. ${process.env.ACCOUNT_HELP_LINK}`)
            }
          } else {
            await ctx.replyWithMarkdown(`Your telegram account @${linkedAccount.tg_name} is already linked to UOS account ${that.manager.uosAccountMarkdownName(linkedAccount.uos_name)}.`)
          }
        } else {
          await ctx.replyWithMarkdown(`UOS account name ${that.manager.uosAccountMarkdownLink(uosName)} not found.`)
        }
      } else {
        await ctx.replyWithMarkdown('Provide valid UOS account name (must be exactly 12 chars length) to link your telegram account with.')
      }
    } catch (e) {
      console.error(e)
      await ctx.replyWithMarkdown(`ERROR: ${e.message}`)
    }
  }

  async unlinkCommand (that, ctx) {
    try {
      const userAccount = await that.manager.getAccountByTelegramId(ctx.message.from.id)
      assert.ok(userAccount,'Your telegram account is not linked with any UOS account.')

      await that.manager.removeAccount(userAccount.tg_uid)
      await ctx.replyWithMarkdown(`Your telegram account @${userAccount.tg_name} unlinked from UOS account ${that.manager.uosAccountMarkdownName(userAccount.uos_name)}.`)

    } catch (e) {
      if (e instanceof AssertionError) {
        console.error(e)
        await ctx.replyWithMarkdown(`Error: ${e.message}`)
      } else {
        console.error(e)
        await ctx.replyWithMarkdown(`GeneralError: ${e.message}`)
      }
    }
  }

  async checkUser (that, ctx, name) {
    let accountScore
    let telegramName

    if (name && name.startsWith('@')) {
      const linkedAccount = await that.manager.getAccountByTelegramName(name.replace('@', ''))
      assert.ok(linkedAccount, 'This telegram account is not linked with UOS account, ask your friend to link accounts via \'/link <UOS account name>\' command.')
      name = linkedAccount.uos_name
      telegramName = linkedAccount.tg_name
    } else if (!name) {
      const userAccount = await that.manager.getAccountByTelegramId(ctx.message.from.id)
      if (userAccount) {
        name = userAccount.uos_name
      }
    }

    assert.ok(name, 'Please use proper command format or link your telegram account to UOS account via \'/link <UOS account name>\' command.')
    assert.ok(name.length === 12, 'Account name must be exactly 12 chars length.')

    accountScore = await that.api.getUosAccountScore(name)
    assert.ok(accountScore && Object.entries(accountScore).length !== 0, `UOS account name '${name}' not found.`)

    await ctx.replyWithMarkdown(that.manager.uosAccountToMarkdown(accountScore, telegramName))

  }

  async checkCommand (that, ctx) {
    try {
      const name = ctx.state.command.args
      await that.checkUser(that, ctx, name)
    } catch (e) {
      if (e instanceof AssertionError) {
        console.error(e)
        await ctx.replyWithMarkdown(`Error: ${e.message}`)
      } else {
        console.error(e)
        await ctx.replyWithMarkdown(`GeneralError: ${e.message}`)
      }
    }
  }

  async balanceCommand (that, ctx) {
    try {
      const linkedAccount = await that.manager.getAccountByTelegramId(ctx.message.from.id)

      assert.ok(linkedAccount, `Your telegram account @${linkedAccount.tg_name} must be linked to UOS account using /link command.`)

      const uosName = linkedAccount.uos_name

      assert.ok(uosName && uosName.length === 12, `UOS account name invalid (must be exactly 12 chars length), fix it using /unlink & /link commands.`)

      const accountBalance = await that._getBalances(that, uosName)

      assert.ok(accountBalance, `Failed to load account balances, please contact developers.`)

      await ctx.replyWithMarkdown(that.manager.uosAccountBalanceToMarkdown(accountBalance), Extra.webPreview(false))

    } catch (e) {
      if (e instanceof AssertionError) {
        console.error(e)
        await ctx.replyWithMarkdown(`Error: ${e.message}`)
      } else {
        console.error(e)
        await ctx.replyWithMarkdown(`GeneralError: ${e.message}`)
      }
    }
  }


  init (manager, api) {
    this.telegraf.start(this.introMessage)

    this.telegraf.help(this.introMessage)

    if (manager && api) {
      this.manager = manager

      this.api = api

      this.telegraf.command('/link', async (ctx) => {
        this.linkCommand(this, ctx)
      })

      this.telegraf.command('/unlink',  async (ctx) => {
        this.unlinkCommand(this, ctx)
      })

      this.telegraf.command('/check', async (ctx) => {
        this.checkCommand(this, ctx)
      })

      this.telegraf.command('/balance', async (ctx) => {
        this.balanceCommand(this, ctx)
      })

    } else {
      console.debug('Bot initialized without link and check commands')
    }

    this.initialized = true
  }

  start () {
    if (this.initialized) {
      if (process.env.NODE_ENV === 'production') {
        /*
              bot.launch({
                webhook: {
                domain: process.env.HEROKU_URL + bot.token,
                port: process.env.PORT
              }
            })
            webhook doesn't work for some reason, so we have to use default mode to start the bot
            */
        this.telegraf.launch()
      } else {
        this.telegraf.launch()
      }

      console.debug('Bot process started in the ' + process.env.NODE_ENV + ' mode')
    } else {
      console.error('Initialize bot before starting')
    }
  }

  stop () {
    this.telegraf.stop()
  }

  async _getBalances(that, accountName) {
    let accountB = {name: accountName, token_balance: {}}

    let token_balance = await that.api.getUosAccountBalance(accountName)

    if (token_balance && Object.entries(token_balance).length !== 0) {
      accountB.token_balance.liquid = new EosioToken(token_balance.liquid).toString()
      accountB.token_balance.stake_net = new EosioToken(token_balance.stake_net).toString()
      accountB.token_balance.stake_cpu = new EosioToken(token_balance.stake_cpu).toString()
    }

    let time_balance = await that.api.getUosAccountTimeLockedBalance(accountName)

    if (time_balance && Object.entries(time_balance).length !== 0) {
      accountB.token_balance.time_locked = new EosioToken(time_balance.total).toString()
      accountB.token_balance.time_locked_w = new EosioToken(time_balance.withdrawal).toString()
    } else {
      accountB.token_balance.time_locked = new EosioToken(0).toString()
      accountB.token_balance.time_locked_w = new EosioToken(0).toString()
    }

    let actv_balance = await that.api.getUosAccountActiveLockedBalance(accountName)

    if (actv_balance && Object.entries(actv_balance).length !== 0) {
      accountB.token_balance.actv_locked = new EosioToken(actv_balance.total).toString()
      accountB.token_balance.actv_locked_w = new EosioToken(actv_balance.withdrawal).toString()
    } else {
      accountB.token_balance.actv_locked = new EosioToken(0).toString()
      accountB.token_balance.actv_locked_w = new EosioToken(0).toString()
    }

    return accountB
  }
}
