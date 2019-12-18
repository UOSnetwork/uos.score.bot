require('dotenv').config()

const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const commandParts = require('telegraf-command-parts')

const assert = require('assert')
const AssertionError = require('assert').AssertionError

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
          const linkedAccount = await that.accountManager.getAccountByTelegramId(ctx.message.from.id)

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
                  const result = await that.accountManager.addAccount({
                    tg_uid: ctx.message.from.id,
                    tg_name: tgName,
                    uos_name: uosName
                  })
                  await ctx.replyWithMarkdown(`Your telegram account @${result.tg_name} linked to UOS account ${that.accountManager.uosAccountMarkdownName(result.uos_name)}.`)
                } else {
                  await ctx.replyWithMarkdown(`${process.env.ACCOUNT_HELP_LINK}`)
                }
              } else {
                await ctx.replyWithMarkdown(`UOS account details for ${that.accountManager.uosAccountMarkdownLink(uosName)} not found, please register on U°Community platform to use this service.`)
              }
            } catch (e) {
              console.error(e)
              await ctx.replyWithMarkdown(`ERROR parsing your UOS account data. ${process.env.ACCOUNT_HELP_LINK}`)
            }
          } else {
            await ctx.replyWithMarkdown(`Your telegram account @${linkedAccount.tg_name} is already linked to UOS account ${that.accountManager.uosAccountMarkdownName(linkedAccount.uos_name)}.`)
          }
        } else {
          await ctx.replyWithMarkdown(`UOS account name ${that.accountManager.uosAccountMarkdownLink(uosName)} not found.`)
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
      const account = await that.accountManager.getAccountByTelegramId(ctx.message.from.id)
      if (account) {
        await that.accountManager.removeAccount(account.tg_uid)
        await ctx.replyWithMarkdown(`Your telegram account @${account.tg_name} unlinked from UOS account ${that.accountManager.uosAccountMarkdownName(account.uos_name)}.`)
      } else {
        await ctx.replyWithMarkdown('Your telegram account is not linked with any UOS account.')
      }
    } catch (e) {
      console.error(e)
      await ctx.replyWithMarkdown(`ERROR: ${e.message}`)
    }
  }

  async checkUser (that, ctx, name) {
    try {
      const myAccount = await that.accountManager.getAccountByTelegramId(ctx.message.from.id)

      if (name) {
        if (name.startsWith('@')) {
          const linkedAccount = await that.accountManager.getAccountByTelegramName(name.replace('@', ''))

          if (linkedAccount) {
            const uosAccount = await that.api.getUosAccountScore(linkedAccount.uos_name)

            if (uosAccount && Object.entries(uosAccount).length !== 0) {
              await ctx.replyWithMarkdown(that.accountManager.uosLinkedAccountToMarkdown(uosAccount, linkedAccount.tg_name))
            } else {
              await ctx.replyWithMarkdown(`UOS account name *'${name}'* not found.`)
            }
          } else {
            await ctx.replyWithMarkdown('This telegram account is not linked with UOS account, ask your friend to link accounts via \'/link <UOS account name>\' command')
          }
        } else if (name.length === 12) {
          const uosAccount = await that.api.getUosAccountScore(name)

          if (uosAccount && Object.entries(uosAccount).length !== 0) {
            await ctx.replyWithMarkdown(that.accountManager.uosAccountToMarkdown(uosAccount))
          } else {
            await ctx.replyWithMarkdown(`UOS account name *'${name}'* not found.`)
          }
        } else {
          await ctx.replyWithMarkdown('Account name must be exactly 12 chars length.')
        }
      } else if (myAccount) {
        const uosAccount = await that.api.getUosAccountScore(myAccount.uos_name)

        if (uosAccount && Object.entries(uosAccount).length !== 0) {
          await ctx.replyWithMarkdown(that.accountManager.uosLinkedAccountToMarkdown(uosAccount, myAccount.tg_name))
        } else {
          await ctx.replyWithMarkdown(`UOS account name *'${name}'* not found.`)
        }
      } else {
        await ctx.replyWithMarkdown('Please link your telegram account to UOS account via \'/link <UOS account name>\' command')
      }
    } catch (e) {
      console.error(e)
      await ctx.replyWithMarkdown(`ERROR: ${e.message}`)
    }
  }

  async checkCommand (that, ctx) {
    try {
      const name = ctx.state.command.args
      await that.checkUser(that, ctx, name)
    } catch (e) {
      console.error(e)
      await ctx.replyWithMarkdown(`ERROR: ${e.message}`)
    }
  }

  async balanceCommand (that, ctx) {
    try {
      const linkedAccount = await that.accountManager.getAccountByTelegramId(ctx.message.from.id)

      assert.ok(linkedAccount, `Your telegram account @${linkedAccount.tg_name} must be linked to UOS account using /link command.`)

      const uosName = linkedAccount.uos_name

      assert.ok(uosName && uosName.length === 12, `UOS account name invalid (must be exactly 12 chars length), fix it using /unlink & /link commands.`)

      const accountBalance = await that.balanceManager.getBalances(uosName)

      assert.ok(accountBalance, `Failed to load account balances, please contact developers.`)

      await ctx.replyWithMarkdown(that.balanceManager.uosAccountBalanceToMarkdown(accountBalance), Extra.webPreview(false))

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


  init (api, accountManager, balanceManager) {
    this.telegraf.start(this.introMessage)

    this.telegraf.help(this.introMessage)

    if (api && accountManager && balanceManager) {
      this.api = api
      this.accountManager = accountManager
      this.balanceManager = balanceManager

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


}
