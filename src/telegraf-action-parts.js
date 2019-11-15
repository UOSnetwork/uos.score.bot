const { mount } = require('telegraf')

const regex = /^!([^@\s]+)\s([^\s]+)$/i

/* eslint no-param-reassign: ["error", { "props": false }] */
module.exports = () => mount('text', (ctx, next) => {
  const parts = regex.exec(ctx.message.text)
  if (!parts) return next()
  const action = {
    text: ctx.message.text,
    command: parts[1],
    arg: parts[2]
  }
  ctx.state.action = action
  return next()
})
