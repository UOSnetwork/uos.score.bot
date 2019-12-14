require('dotenv').config()

const EosioToken = require('./eosio.token')

module.exports = class BalanceManager {
  constructor (api) {
    this.api = api
  }

  uosAccountBalanceToMarkdown (accountB) {
    return `UOS account ${accountB.name}° balances:
      \`     Liquid: ${accountB.liquid}\`
      \`  Stake NET: ${accountB.stake_net}\`
      \`  Stake CPU: ${accountB.stake_cpu}\`
      \`Time Locked: ${accountB.time_locked}, can withdraw: ${accountB.time_unlocked}\`
      \`Actv Locked: ${accountB.actv_locked}, can withdraw: ${accountB.actv_unlocked}\``
  }

  async getBalances(accountName) {
    let zero = new EosioToken(0)
    let accountB = {
      name: accountName,
      liquid: zero.toString(),
      stake_net: zero.toString(),
      stake_cpu: zero.toString(),
      time_locked: zero.toString(),
      time_unlocked: zero.toString(),
      actv_locked: zero.toString(),
      actv_unlocked: zero.toString()
    }

    let token_balance = await this.api.getUosAccountBalance(accountName)

    if (token_balance && Object.entries(token_balance).length !== 0) {
      accountB.liquid = new EosioToken(token_balance.liquid).toString()
      accountB.stake_net = new EosioToken(token_balance.stake_net).toString()
      accountB.stake_cpu = new EosioToken(token_balance.stake_cpu).toString()
    }

    let time_balance = await this.api.getUosAccountTimeLockedBalance(accountName)

    if (time_balance && Object.entries(time_balance).length !== 0) {
      let bal = {
        total: new EosioToken(time_balance.total),
        withdrawal: new EosioToken(time_balance.withdrawal)
      }
      accountB.time_locked = bal.total.toString()
      accountB.time_unlocked = this.getAvailTimeLockedWithdrawal(bal).toString()
    }

    let actv_balance = await this.api.getUosAccountActiveLockedBalance(accountName)

    if (actv_balance && Object.entries(actv_balance).length !== 0) {
      let bal = {
        total: new EosioToken(actv_balance.total),
        withdrawal: new EosioToken(actv_balance.withdrawal)
      }
      accountB.actv_locked = bal.total.toString()
      accountB.actv_unlocked = this.getAvailTimeLockedWithdrawal(bal).toString()
    }

    return accountB
  }

  getAvailTimeLockedWithdrawal(balance) {

    let start = new Date(process.env.UOS_TIMELOCK_START).getTime()
    let end = new Date(process.env.UOS_TIMELOCK_END).getTime()
    let now = new Date().getTime()

    /*
    withdraw_limit = (uint64_t)((float)itr->deposit
                                          * (float)(current_time - lim_begin)
                                          / (float)(lim_end - lim_begin));
     */
    let w_avail = balance.total.value * (now - start) / (end - start) - balance.withdrawal.value

    if (w_avail > 0) {
      return new EosioToken(w_avail.toFixed(balance.withdrawal.decimal))
    } else {
      return new EosioToken(0)
    }
  }
}
