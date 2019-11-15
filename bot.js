require('dotenv').config()

const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const commandParts = require('telegraf-command-parts')
const actionParts = require('./src/telegraf-action-parts')

const AccountManager = require('./src/account_manager')
const UosApi = require('./src/uos_api')

const conn = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  debug: false
})

const bot = new Telegraf(process.env.TOKEN)

// bot.telegram.getMe().then((botInfo) => {
//    bot.options.username = botInfo.username;
// });

const manager = new AccountManager(conn)
const api = new UosApi()

bot.use(Telegraf.log())

bot.use(commandParts())
bot.use(actionParts())

/*
bot.use((ctx, next) => {
    return ctx.message.from.id == process.env.AUTH_USER_ID ? next(ctx) : ctx.reply('Access Denied')
})
*/

// ---- START Command
const introMessage = async (ctx) => {
  await ctx.replyWithMarkdown(`
I can help you to know the score of UOS Network accounts.

*Bot Commands*

/link <UOS account name> - Links your telegram account to specified UOS account

/unlink - Unlinks your telegram account from any linked UOS accounts

/check <Telegram/UOS account name> - Check the score of any telegram account (starting with @) or UOS account, sending this command without arguments shows your own score

!score <Telegram/UOS account name> - Same as above, doesn't work without argument

[❤❤❤ Join bot community! ❤❤❤](https://u.community/communities/245)`, Extra.webPreview(false))
}

bot.start(introMessage)
bot.help(introMessage)
// ---- START Command

// ---- CHECK/SCORE Command
const checkUser = async (ctx, name) => {
  try {
    const myAccount = await manager.getAccountByTelegramId(ctx.message.from.id)

    if (name) {
      if (name.startsWith('@')) {
        const linkedAccount = await manager.getAccountByTelegramName(name.replace('@', ''))

        if (linkedAccount) {
          const uosAccount = await api.getUosAccountScore(linkedAccount.uos_name)

          if (uosAccount && Object.entries(uosAccount).length !== 0) {
            await ctx.replyWithMarkdown(manager.uosLinkedAccountToMarkdown(uosAccount, linkedAccount.tg_name))
          } else {
            await ctx.replyWithMarkdown(`UOS account name *'${name}'* not found.`)
          }
        } else {
          await ctx.replyWithMarkdown('This telegram account is not linked with UOS account, ask your friend to link accounts via \'/link <UOS account name>\' command')
        }
      } else if (name.length === 12) {
        const uosAccount = await api.getUosAccountScore(name)

        if (uosAccount && Object.entries(uosAccount).length !== 0) {
          await ctx.replyWithMarkdown(manager.uosAccountToMarkdown(uosAccount))
        } else {
          await ctx.replyWithMarkdown(`UOS account name *'${name}'* not found.`)
        }
      } else {
        await ctx.replyWithMarkdown('Account name must be exactly 12 chars length.')
      }
    } else if (myAccount) {
      const uosAccount = await api.getUosAccountScore(myAccount.uos_name)

      if (uosAccount && Object.entries(uosAccount).length !== 0) {
        await ctx.replyWithMarkdown(manager.uosLinkedAccountToMarkdown(uosAccount, myAccount.tg_name))
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

const checkCommand = async (ctx) => {
  try {
    const name = ctx.state.command.args
    await checkUser(ctx, name)
  } catch (e) {
    console.error(e)
    await ctx.replyWithMarkdown(`ERROR: ${e.message}`)
  }
}

bot.command('/check', checkCommand)

bot.on('text', async (ctx, next) => {
  if (ctx.state.action && ctx.state.action.command === 'score') {
    await checkUser(ctx, ctx.state.action.arg)
  } else {
    next(ctx)
  }
})

// ---- CHECK/SCORE Command

// ---- LINK Command
const linkCommand = async (ctx) => {
  try {
    const uosName = ctx.state.command.args
    const tgName = ctx.message.from.username

    if (uosName && uosName.length === 12) {
      const uosAccount = await api.getUosAccountScore(uosName)

      if (uosAccount && Object.entries(uosAccount).length !== 0) {
        const linkedAccount = await manager.getAccountByTelegramId(ctx.message.from.id)

        if (!linkedAccount) {
          const uosAccountDetails = JSON.parse(await api.getUosAccountDetails(uosName))

          if (uosAccountDetails && Object.entries(uosAccountDetails).length !== 0) {
            let found = false

            for (const source of uosAccountDetails.usersSources) {
              if (source.sourceUrl.indexOf(tgName) > 0) {
                found = true
              }
            }

            if (found) {
              const result = await manager.addAccount({
                tg_uid: ctx.message.from.id,
                tg_name: tgName,
                uos_name: uosName
              })
              await ctx.replyWithMarkdown(`Your telegram account @${result.tg_name} linked to UOS account ${manager.uosAccountMarkdownName(result.uos_name)}.`)
            } else {
              await ctx.replyWithMarkdown('[Please add your telegram account link to your profile on U°Community platform.](https://u.community/)')
            }
          } else {
            await ctx.replyWithMarkdown(`UOS account details for ${manager.uosAccountMarkdownLink(uosName)} not found, please register on U°Community platform to use this service.`)
          }
        } else {
          await ctx.replyWithMarkdown(`Your telegram account @${linkedAccount.tg_name} is already linked to UOS account ${manager.uosAccountMarkdownName(linkedAccount.uos_name)}.`)
        }
      } else {
        await ctx.replyWithMarkdown(`UOS account name ${manager.uosAccountMarkdownLink(uosName)} not found.`)
      }
    } else {
      await ctx.replyWithMarkdown('Provide valid UOS account name (must be exactly 12 chars length) to link your telegram account with.')
    }
  } catch (e) {
    console.error(e)
    await ctx.replyWithMarkdown(`ERROR: ${e.message}`)
  }
}

bot.command('/link', linkCommand)
// ---- LINK Command

// ---- UNLINK Command
const unlinkCommand = async (ctx) => {
  try {
    const account = await manager.getAccountByTelegramId(ctx.message.from.id)
    if (account) {
      await manager.removeAccount(account.tg_uid)
      await ctx.replyWithMarkdown(`Your telegram account @${account.tg_name} unlinked from UOS account ${manager.uosAccountMarkdownName(account.uos_name)}.`)
    } else {
      await ctx.replyWithMarkdown('Your telegram account is not linked with any UOS account.')
    }
  } catch (e) {
    console.error(e)
    await ctx.replyWithMarkdown(`ERROR: ${e.message}`)
  }
}

bot.command('/unlink', unlinkCommand)
// ---- UNLINK Command

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
  bot.launch()
} else {
  bot.launch()
}

console.log('Bot server started in the ' + process.env.NODE_ENV + ' mode')
