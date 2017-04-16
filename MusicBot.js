'use strict'
process.title = 'WildBeats'
const Discordie = require('discordie')
let Commands = []
let Aliases = []
const config = require('./config.json')
const Event = Discordie.Events
const bot = new Discordie({
  messageCacheLimit: 100,
  autoReconnect: true
})
loadCommands()

bot.Dispatcher.on(Event.GATEWAY_READY, () => {
  console.log('READY!')
})

bot.Dispatcher.on(Event.DISCONNECTED, () => {
  console.log('Disconnected, trying to reconnect...')
})

bot.Dispatcher.on(Event.VOICE_DISCONNECTED, e => {
  const channel = e.voiceConnection.channel
  if (!channel || e.manual) return

  if (e.endpointAwait) {
    e.endpointAwait
      .then(info => onConnected(info))
      .catch(() => {
        setTimeout(() => reconnect(channel), 5000)
      })
    return
  }
  setTimeout(() => reconnect(channel), 5000)
})


bot.Dispatcher.on(Event.MESSAGE_CREATE, c => {
  let msg = c.message
  let chunks = msg.content.split(' ')
  let cmd = chunks[0].substr(config.prefix.length)
  let suffix = chunks.slice(1, chunks.length).join(' ')
  if (Aliases[cmd] !== undefined) cmd = Aliases[cmd].name
  if (msg.content.indexOf(config.prefix) === 0) {
    if (typeof Commands[cmd] === 'object' && Commands[cmd]) {
      console.log(`Executing <${msg.resolveContent()}> in server <${msg.guild.name}> from user <${msg.author.username}>`)
      try {
        Commands[cmd].fn(bot, msg, suffix)
      } catch(error) {
        msg.channel.sendMessage(`An error has occurred, please report this error to my developer.\n\`\`\`${error}\`\`\``)
      }
    }
  }
})

bot.connect({
  token: config.token
})

function loadCommands() {
  Commands = require('./runtime/commands.js').Commands
  for (let a in Commands) {
    if (Commands[a].aliases !== undefined) {
      for (let n in Commands[a].aliases) {
        Aliases[Commands[a].aliases[n]] = Commands[a]
      }
    }
  }
}

function reconnect(channel) {
  let channelName = channel.name
  channel.join()
    .then(info => console.log("Connected to " + channelName))
    .catch(() => console.log("Failed to connect to " + channelName))
}