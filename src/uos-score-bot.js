require('dotenv').config()

const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const commandParts = require('telegraf-command-parts')

module.exports = class UosScoreBot {
  constructor (token, params) {
    this.token = token

    this.initialized = false

    if (params) {
      this.telegraf = new Telegraf(this.token, params)
    } else {
      this.telegraf = new Telegraf(this.token)
    }

    if (process.env.NODE_ENV !== 'production') {
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

[❤❤❤ Join bot community! ❤❤❤](https://u.community/communities/245)`, Extra.webPreview(false))
  }

  async linkCommand (ctx) {
    try {
      const uosName = ctx.state.command.args
      const tgName = ctx.message.from.username

      if (uosName && uosName.length === 12) {
        const uosAccount = await this.api.getUosAccountScore(uosName)

        if (uosAccount && Object.entries(uosAccount).length !== 0) {
          const linkedAccount = await this.manager.getAccountByTelegramId(ctx.message.from.id)

          if (!linkedAccount) {
            try {
              const uosAccountDetails = JSON.parse(await this.api.getUosAccountDetails(uosName))

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
                  const result = await this.manager.addAccount({
                    tg_uid: ctx.message.from.id,
                    tg_name: tgName,
                    uos_name: uosName
                  })
                  await ctx.replyWithMarkdown(`Your telegram account @${result.tg_name} linked to UOS account ${this.manager.uosAccountMarkdownName(result.uos_name)}.`)
                } else {
                  await ctx.replyWithMarkdown(`${process.env.ACCOUNT_HELP_LINK}`)
                }
              } else {
                await ctx.replyWithMarkdown(`UOS account details for ${this.manager.uosAccountMarkdownLink(uosName)} not found, please register on U°Community platform to use this service.`)
              }
            } catch (e) {
              console.error(e)
              await ctx.replyWithMarkdown(`ERROR parsing your UOS account data. ${process.env.ACCOUNT_HELP_LINK}`)
            }
          } else {
            await ctx.replyWithMarkdown(`Your telegram account @${linkedAccount.tg_name} is already linked to UOS account ${this.manager.uosAccountMarkdownName(linkedAccount.uos_name)}.`)
          }
        } else {
          await ctx.replyWithMarkdown(`UOS account name ${this.manager.uosAccountMarkdownLink(uosName)} not found.`)
        }
      } else {
        await ctx.replyWithMarkdown('Provide valid UOS account name (must be exactly 12 chars length) to link your telegram account with.')
      }
    } catch (e) {
      console.error(e)
      await ctx.replyWithMarkdown(`ERROR: ${e.message}`)
    }
  }

  async unlinkCommand (ctx) {
    try {
      const account = await this.manager.getAccountByTelegramId(ctx.message.from.id)
      if (account) {
        await this.manager.removeAccount(account.tg_uid)
        await ctx.replyWithMarkdown(`Your telegram account @${account.tg_name} unlinked from UOS account ${this.manager.uosAccountMarkdownName(account.uos_name)}.`)
      } else {
        await ctx.replyWithMarkdown('Your telegram account is not linked with any UOS account.')
      }
    } catch (e) {
      console.error(e)
      await ctx.replyWithMarkdown(`ERROR: ${e.message}`)
    }
  }

  async checkUser (ctx, name) {
    try {
      const myAccount = await this.manager.getAccountByTelegramId(ctx.message.from.id)

      if (name) {
        if (name.startsWith('@')) {
          const linkedAccount = await this.manager.getAccountByTelegramName(name.replace('@', ''))

          if (linkedAccount) {
            const uosAccount = await this.api.getUosAccountScore(linkedAccount.uos_name)

            if (uosAccount && Object.entries(uosAccount).length !== 0) {
              await ctx.replyWithMarkdown(this.manager.uosLinkedAccountToMarkdown(uosAccount, linkedAccount.tg_name))
            } else {
              await ctx.replyWithMarkdown(`UOS account name *'${name}'* not found.`)
            }
          } else {
            await ctx.replyWithMarkdown('This telegram account is not linked with UOS account, ask your friend to link accounts via \'/link <UOS account name>\' command')
          }
        } else if (name.length === 12) {
          const uosAccount = await this.api.getUosAccountScore(name)

          if (uosAccount && Object.entries(uosAccount).length !== 0) {
            await ctx.replyWithMarkdown(this.manager.uosAccountToMarkdown(uosAccount))
          } else {
            await ctx.replyWithMarkdown(`UOS account name *'${name}'* not found.`)
          }
        } else {
          await ctx.replyWithMarkdown('Account name must be exactly 12 chars length.')
        }
      } else if (myAccount) {
        const uosAccount = await this.api.getUosAccountScore(myAccount.uos_name)

        if (uosAccount && Object.entries(uosAccount).length !== 0) {
          await ctx.replyWithMarkdown(this.manager.uosLinkedAccountToMarkdown(uosAccount, myAccount.tg_name))
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

  async checkCommand (ctx) {
    try {
      const name = ctx.state.command.args
      await this.checkUser(ctx, name)
    } catch (e) {
      console.error(e)
      await ctx.replyWithMarkdown(`ERROR: ${e.message}`)
    }
  }

  init (manager, api) {
    this.telegraf.start(this.introMessage)

    this.telegraf.help(this.introMessage)

    if (manager && api) {
      this.manager = manager

      this.api = api

      this.telegraf.command('/link', this.linkCommand)

      this.telegraf.command('/unlink', this.unlinkCommand)

      this.telegraf.command('/check', this.checkCommand)

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
