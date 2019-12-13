require('dotenv').config()

const { JsonRpc } = require('eosjs')
const fetch = require('node-fetch')

module.exports = class UosApi {
  constructor () {
    this.rpc = new JsonRpc(process.env.UOS_API_URL, { fetch })
  }

  async getUosAccountScore (username) {
    const response = await fetch(process.env.UOS_API_URL + process.env.UOS_API_URI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: `{"acc_name":"${username}"}`
    })

    const data = JSON.parse(await response.json())

    let account = {}

    if (data && Object.entries(data).length !== 0) {
      account = {
        account_name: data.name,
        social_rate: (data.values.scaled_social_rate * process.env.RATE_MULTIPLIER).toFixed(),
        importance_rate: (data.values.scaled_importance * process.env.RATE_MULTIPLIER).toFixed()
      }
    }

    return account
  }

  async getUosAccountDetails (accountName) {
    const response = await this.rpc.get_table_rows({
      json: true,
      code: 'uaccountinfo',
      scope: accountName,
      table: 'accprofile',
      limit: 1
    })

    const data = await response.rows

    let accountD = {}

    if (data && data.length > 0) {
      const details = JSON.parse(data[0].profile_json)
      if (details && Object.entries(details).length !== 0) {
        accountD = details
      }
    }

    return accountD
  }

  async getUosAccountBalance (accountName) {
    const account = await this.rpc.get_account(accountName)

    let accountB = {}

    if (account && Object.entries(account).length !== 0) {
      accountB = {
        name: account.account_name,
        liquid: 0,
        stake_net: 0,
        stake_cpu: 0
      }
      if(account.core_liquid_balance) {
        accountB.liquid = account.core_liquid_balance
      }
      if (account.self_delegated_bandwidth) {
        accountB.stake_net = account.self_delegated_bandwidth.net_weight
        accountB.stake_cpu = account.self_delegated_bandwidth.cpu_weight
      }
    }

    return accountB
  }

  async getUosAccountVestedBalance (accountName, table) {
    const response = await this.rpc.get_table_rows({
      json: true,
      code: table,
      scope: table,
      table: 'balance',
      lower_bound: accountName,
      limit: 1
    })

    const data = await response.rows

    let accountB = {}

    if (data && data.length > 0) {
        accountB = {
          total: data[0].deposit,
          withdrawal: data[0].withdrawal
        }
    }

    return accountB
  }

  async getUosAccountTimeLockedBalance (accountName) {
    return this.getUosAccountVestedBalance(accountName, process.env.UOS_TIMELOCK_CONTRACT_NAME)
  }
  async getUosAccountActiveLockedBalance (accountName) {
    return this.getUosAccountVestedBalance(accountName, process.env.UOS_ACTLOCK_CONTRACT_NAME)
  }
}
