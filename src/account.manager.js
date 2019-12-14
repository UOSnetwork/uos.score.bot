require('dotenv').config()

module.exports = class AccountManager {
  constructor (conn) {
    this.connnection = conn
    this.format = new Intl.NumberFormat()
  }

  uosAccountMarkdownLink (name) {
    return `[${name}°](${process.env.UCOM_USER_URL + process.env.UCOM_USER_URI + name})`
  }

  uosAccountMarkdownName (name) {
    return `${name}°`
  }

  uosAccountToMarkdown (account) {
    return `UOS score for ${this.uosAccountMarkdownLink(account.account_name)}
      \`Importance: ${this.format.format(account.importance_rate)}°\`
      \`    Social: ${this.format.format(account.social_rate)}°\``
  }

  uosLinkedAccountToMarkdown (account, name) {
    return `UOS score for *@${name}* linked with ${this.uosAccountMarkdownLink(account.account_name)} 
      \`Importance: ${this.format.format(account.importance_rate)}°\`
      \`    Social: ${this.format.format(account.social_rate)}°\``
  }

  async _list () {
    const result = (await this.connnection.from('tbl_accounts').select('*')).map(function (row) {
      return {
        tg_uid: row.tg_uid,
        tg_name: row.tg_name,
        uos_name: row.uos_name,
        last_update: row.last_update
      }
    })
    return result
  }

  async _count () {
    const result = (await this.connnection.from('tbl_accounts').count('tg_uid'))[0].count
    return result
  }

  async getList () {
    return this._list()
  }

  async getCount () {
    return this._count()
  }

  async _add (item) {
    const account = {
      tg_uid: item.tg_uid,
      tg_name: item.tg_name,
      uos_name: item.uos_name,
      last_update: new Date()
    }

    const result = await this.connnection.insert(account, ['tg_uid', 'tg_name', 'uos_name', 'last_update']).into('tbl_accounts')

    return result[0]
  }

  async addAccount (item) {
    return this._add(item)
  }

  async _remove (id) {
    await this.connnection('tbl_accounts').where('tg_uid', '=', id).delete()

    return true
  }

  async removeAccount (id) {
    return this._remove(id)
  }

  async _save (item) {
    const result = await this.connnection('tbl_accounts').where('tg_uid', '=', item.tg_uid).update({
      tg_name: item.tg_name,
      uos_name: item.uos_name,
      last_update: new Date()
    })
    return result[0]
  }

  async saveAccount (item) {
    return this._save(item)
  }

  async _get (param = 'tg_uid', value) {
    const result = (await this.connnection.from('tbl_accounts').where(param, '=', value).select('*')).map(function (row) {
      return {
        tg_uid: row.tg_uid,
        tg_name: row.tg_name,
        uos_name: row.uos_name,
        last_update: row.last_update
      }
    })
    return result[0]
  }

  async getAccountByTelegramId (id) {
    return this._get('tg_uid', id)
  }

  async getAccountByTelegramName (name) {
    return this._get('tg_name', name)
  }

  async getAccountByUosName (name) {
    return this._get('uos_name', name)
  }
}
