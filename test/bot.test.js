const UosScoreBot = require('../src/uos.score.bot')

const { assert } = require('chai')

const TelegramServer = require('telegram-test-api')

describe('Telegram bot test', () => {
  const serverConfig = { port: 9001 }

  const token = 'TestServerBotToken'

  let server

  before(() => {
    server = new TelegramServer(serverConfig)

    return server.start().then(() => {
      const bot = new UosScoreBot(token, { telegram: { apiRoot: server.ApiURL } })

      bot.init()

      bot.start()
    })
  })

  after(() => server.stop())

  it('should react on start command', async () => {
    const client = server.getClient(token, { timeout: 5000 })
    const command = client.makeCommand('/start')
    const res = await client.sendCommand(command)
    assert.equal(res.ok, true)

    const updates = await client.getUpdates()
    assert.equal(updates.ok, true)
    assert.equal(updates.result.length, 1, 'updates queue should contain only one message')

    assert.include(updates.result[0].message.text, 'I can help you to know the score of UOS Network accounts.', 'output should contain specific message')
  })

  it('should react on help command', async () => {
    const client = server.getClient(token, { timeout: 5000 })
    const command = client.makeCommand('/help')
    const res = await client.sendCommand(command)
    assert.equal(res.ok, true)

    const updates = await client.getUpdates()
    assert.equal(updates.ok, true)
    assert.equal(updates.result.length, 1, 'updates queue should contain only one message')

    assert.include(updates.result[0].message.text, 'I can help you to know the score of UOS Network accounts.', 'output should contain specific message')
  })
})
