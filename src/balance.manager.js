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
      liquid: zero,
      stake_net: zero,
      stake_cpu: zero,
      time_locked: zero,
      time_unlocked: zero,
      actv_locked: zero,
      actv_unlocked: zero
    }

    let token_balance = await this.api.getUosAccountBalance(accountName)

    if (token_balance && Object.entries(token_balance).length !== 0) {
      accountB.liquid = new EosioToken(token_balance.liquid)
      accountB.stake_net = new EosioToken(token_balance.stake_net)
      accountB.stake_cpu = new EosioToken(token_balance.stake_cpu)
    }

    let time_balance = await this.api.getUosAccountTimeLockedBalance(accountName)

    if (time_balance && Object.entries(time_balance).length !== 0) {
      let bal = {
        total: new EosioToken(time_balance.total),
        withdrawal: new EosioToken(time_balance.withdrawal)
      }
      accountB.time_locked = bal.total
      accountB.time_unlocked = this.getAvailTimeLockedWithdrawal(bal)
    }

    let actv_balance = await this.api.getUosAccountActiveLockedBalance(accountName)

    if (actv_balance && Object.entries(actv_balance).length !== 0) {
      let bal = {
        total: new EosioToken(actv_balance.total),
        withdrawal: new EosioToken(actv_balance.withdrawal),
        total_emission: zero
      }

      let emission = await this.api.getUosAccountEmissionBalance(accountName)

      if (emission && Object.entries(emission).length !== 0) {
        bal.emission = new EosioToken(emission.total)
      }

      accountB.actv_locked = bal.total
      accountB.actv_unlocked = this.getAvailActivityLockedWithdrawal(bal)
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

  getAvailActivityLockedWithdrawal(balance) {

    let start = new Date(process.env.UOS_TIMELOCK_START).getTime()
    let end = new Date(process.env.UOS_TIMELOCK_END).getTime()
    let now = new Date().getTime()

    /*
    limit_by_time = (uint64_t)((float)itr->deposit
                                      * (float)(current_time - time_begin)
                                      / (float)(time_end - time_begin));
     */
    let w_time = balance.total.value * (now - start) / (end - start)

    /*
    uint64_t limit_by_emission = (uint64_t)((float)emission.amount * mult);
     */

    let w_activity = balance.total_emission.value * process.env.UOS_ACTLOCK_MULTIPLIER

    let w_avail = w_time

    if (w_activity < w_avail) w_avail = w_activity

    w_avail = w_avail - balance.withdrawal.value

    if (w_avail > 0) {
      return new EosioToken(w_avail.toFixed(balance.withdrawal.decimal))
    } else {
      return new EosioToken(0)
    }
  }
}
