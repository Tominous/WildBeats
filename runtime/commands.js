const config = require('../config.json');
const Songs = require('./songs.json');
const DL = require('youtube-dl');
let winston = require('../runtime/winston.js');
let needle = require('needle');
let Commands = [];
let info = {};
let song = [];

Commands.summon = {
    name: 'summon',
    aliases: ['join-voice', 'voice'],
    help: 'Initiate me in a voice channel.',
    fn: function (bot, msg) {
        let voiceCon = bot.VoiceConnections.find(o => o.voiceConnection.guild.id === msg.guild.id);
        let server = config.hasOwnProperty(msg.guild.name) ? config[msg.guild.name] : config[msg.guild.id];
        let voiceChan = isNaN(server.voice_channel) ? msg.guild.voiceChannels.find(c => c.name === server.voice_channel) : msg.guild.voiceChannels.find(c => c.id === server.voice_channel);
        let boundChan = isNaN(server.text_channel) ? msg.guild.textChannels.find(c => c.name === server.text_channel) : msg.guild.textChannels.find(c => c.id === server.text_channel);
        if (server) {
            if (!boundChan || !voiceChan) {
                msg.channel.sendMessage(`The ${boundChan === undefined ? "text" : "voice"} channel set for this server is incorrect.`)
            } else if (!voiceCon && boundChan && voiceChan) {
                info[msg.guild.id] = {
                    boundChannel: boundChan,
                    volume: 25,
                    paused: false,
                    encoder: undefined,
                    link: [],
                    id: [],
                    title: [],
                    duration: [],
                    requester: [],
                    waitMusic: []
                };
                voiceChan.join().then(() => {
                    Commands.skip.fn(bot, msg)
                }).catch(err => {
                    console.error(err)
                })
            }
        }
    }
};

Commands.leave = {
    name: 'leave',
    aliases: ['disconnect'],
    help: 'Make me leave the voice channel.',
    fn: function (bot, msg) {
        if (config.allowedUsers.master.indexOf(msg.author.id) > -1 || config.allowedUsers.admin.indexOf(msg.author.id) > -1) {
            let voiceCon = bot.VoiceConnections.find(o => o.voiceConnection.guild.id === msg.guild.id);
            voiceCon.voiceConnection.disconnect();
            delete info[msg.guild.id]
        }
    }
};

Commands.volume = {
    name: 'volume',
    aliases: ['vol'],
    help: 'Control how loud the music is.',
    fn: function (bot, msg, suffix) {
        let voiceCon = bot.VoiceConnections.find(v => v.voiceConnection.guild.id === msg.guild.id);
        if (info[msg.guild.id].boundChannel.id === msg.channel.id && voiceCon) {
            if (suffix.length === 0) {
                msg.channel.sendMessage(`The volume is currently set to ${info[msg.guild.id].volume}`)
            } else if (isNaN(suffix) || suffix < 0 || suffix > 100) {
                msg.channel.sendMessage('The number must be between 0 and 100')
            } else {
                info[msg.guild.id].volume = suffix;
                voiceCon.voiceConnection.getEncoder().setVolume(suffix);
                msg.channel.sendMessage(`Volume has been adjusted to ${suffix}`)
            }
        }
    }
};

Commands.pause = {
    name: 'pause',
    help: 'Pause the current stream.',
    fn: function (bot, msg) {
        let voiceCon = bot.VoiceConnections.find(o => o.voiceConnection.guild.id === msg.guild.id);
        if (info[msg.guild.id].boundChannel.id === msg.channel.id && !voiceCon) {
            msg.channel.sendMessage('Not connected.')
        } else {
            if (!info[msg.guild.id].paused) {
                msg.reply('Music has been paused.');
                voiceCon.voiceConnection.getEncoderStream().cork();
                info[msg.guild.id].paused = true
            } else {
                msg.reply('The music is already paused.')

            }
        }
    }
};

Commands.resume = {
    name: 'resume',
    help: 'Resume the current stream.',
    fn: function (bot, msg) {
        let voiceCon = bot.VoiceConnections.find(o => o.voiceConnection.guild.id === msg.guild.id);
        if (info[msg.guild.id].boundChannel.id === msg.channel.id && !voiceCon) {
            msg.channel.sendMessage('Not connected.')
        } else {
            if (info[msg.guild.id].paused) {
                msg.reply('Music has been resumed.');
                voiceCon.voiceConnection.getEncoderStream().uncork();
                info[msg.guild.id].paused = false
            } else {
                msg.reply('Music is not paused')
            }
        }
    }
};

Commands.play = {
    name: 'play',
    aliases: ['request', 'add'],
    help: 'Request something to play.',
    fn: function (bot, msg, suffix) {
        let voiceCon = bot.VoiceConnections.find(o => o.voiceConnection.guild.id === msg.guild.id);
        if (info[msg.guild.id].boundChannel.id === msg.channel.id && !voiceCon) {
            msg.channel.sendMessage('Not connected.')
        } else {
            if (suffix.length === 0) {
                msg.reply('Say what you\'d like me to search for')
            } else if (/^http/.test(suffix)) {
                fetch(bot, msg, suffix)
            } else {
                fetch(bot, msg, `ytsearch:${suffix}`)
            }
        }
        // this command is garbage, needs to be rewritten to support more stuff
    }
};

Commands.skip = {
    name: 'skip',
    aliases: ['next'],
    help: 'Skips a song.',
    fn: function (bot, msg) {
        let voiceCon = bot.VoiceConnections.find(o => o.voiceConnection.guild.id === msg.guild.id);
        if (info[msg.guild.id].boundChannel.id === msg.channel.id && voiceCon) {
            if (info[msg.guild.id].link.length === 0) {
                if (info[msg.guild.id].waitMusic.length <= 1) {
                    shuffleList(Songs).then(arr => {
                        info[msg.guild.id].waitMusic = arr;
                        playSong(bot, msg)
                    })
                } else {
                    info[msg.guild.id].waitMusic.shift();
                    playSong(bot, msg)
                }
            } else {
                info[msg.guild.id].duration.shift();
                info[msg.guild.id].link.shift();
                info[msg.guild.id].requester.shift();
                info[msg.guild.id].title.shift();
                info[msg.guild.id].id.shift();
                playSong(bot, msg)
            }
        }
        // make it a vote system, if user has master privs skip right away
    }
};

Commands.playlist = {
    name: 'playlist',
    aliases: ['list', 'queue'],
    help: 'Gets the playlist.',
    fn: function (bot, msg) {
        let voiceCon = bot.VoiceConnections.find(o => o.voiceConnection.guild.id === msg.guild.id);
        if (info[msg.guild.id].boundChannel.id === msg.channel.id && voiceCon) {
            if (info[msg.guild.id].title.length !== 0) {
                let arr = [];
                arr.push(`Currently playing **${info[msg.guild.id].title[0]}** requested by *${msg.guild.members.find(m => m.id === info[msg.guild.id].requester[0]).username}*`);
                for (let i = 1; i < info[msg.guild.id].link.length; i++) {
                    arr.push(`${i}. ${info[msg.guild.id].title[i]} requested by ${msg.guild.members.find(m => m.id === info[msg.guild.id].requester[i]).username}`);
                    if (i === 9) {
                        arr.push(`${info[msg.guild.id].title.length - 10 > 0 ? 'And about ' + info[msg.guild.id].title.length - 10 + ' more songs.' : null}`);
                        break
                    }
                }
                msg.channel.sendMessage(arr.join('\n'))
            } else {
                msg.reply('The playlist is currently empty, add something you want me to play.')
            }
        }
        // Need to employ a method to delete a certain entry or all from a user.
    }
};

Commands.remove = {
  name: 'remove',
  aliases: ['delete'],
  help: 'Remove a queued song by number or from a user.',
  fn: function (bot, msg, suffix) {
      if (isNaN(suffix) && msg.mentions.length >= 1) {
          winston.info('This is for mentions')
      } else if (suffix) {
          winston.info('This is to purge just one')
      } else {
          winston.info('no suffix, tell person how to use command.')
      }
  }
};

Commands.eval = {
    name: 'eval',
    help: 'Allows for the execution of arbitrary Javascript.',
    level: 'master',
    fn: function (bot, msg, suffix) {
        if (config.allowedUsers.master.indexOf(msg.author.id) > -1) {
            var util = require('util');
            try {
                var returned = eval(suffix);
                var str = util.inspect(returned, {
                    depth: 1
                });
                if (str.length > 1900) {
                    str = str.substr(0, 1897);
                    str = str + '...'
                }
                str = str.replace(new RegExp(bot.token, 'gi'), '( ͡° ͜ʖ ͡°)'); // Because some frog broke this string with a shruglenny
                msg.channel.sendMessage('```xl\n' + str + '\n```').then((ms) => {
                    if (returned !== undefined && returned !== null && typeof returned.then === 'function') {
                        returned.then(() => {
                            var str = util.inspect(returned, {
                                depth: 1
                            });
                            if (str.length > 1900) {
                                str = str.substr(0, 1897);
                                str = str + '...'
                            }
                            ms.edit('```xl\n' + str + '\n```')
                        }, (e) => {
                            var str = util.inspect(e, {
                                depth: 1
                            });
                            if (str.length > 1900) {
                                str = str.substr(0, 1897);
                                str = str + '...'
                            }
                            ms.edit('```xl\n' + str + '\n```')
                        })
                    }
                })
            } catch (e) {
                msg.channel.sendMessage('```xl\n' + e + '\n```')
            }
        }
    }
};

exports.Commands = Commands;

function fetch(bot, msg, suffix) {
    DL.getInfo(suffix, ['--verbose', '--skip-download', '-f bestaudio/worstaudio'], (err, i) => {
        if (err) {
            info[msg.guild.id].boundChannel.sendMessage(suffix + " could not be added to the playlist.");
            console.error(err)
        } else {
            if (info[msg.guild.id].link.length === 0) {
                info[msg.guild.id].link.push(i.url);
                info[msg.guild.id].title.push(i.title);
                info[msg.guild.id].id.push(i.id);
                info[msg.guild.id].duration.push(i.duration);
                info[msg.guild.id].requester.push(msg.author.id);
                playSong(bot, msg)
            } else {
                info[msg.guild.id].link.push(i.url);
                info[msg.guild.id].title.push(i.title);
                info[msg.guild.id].id.push(i.id);
                info[msg.guild.id].duration.push(i.duration);
                info[msg.guild.id].requester.push(msg.author.id);
                info[msg.guild.id].boundChannel.sendMessage(`Added **${i.title} [${i.duration}]** to the queue`)
            }
        }
    });
}

function playSong(bot, msg) {
    let streamable = require('stream').Readable();
    info[msg.guild.id].encoder = bot.VoiceConnections.find(v => v.voiceConnection.guild.id === msg.guild.id).voiceConnection.createExternalEncoder({
        type: 'ffmpeg',
        format: 'pcm',
        source: '-',
        debug: true
    });
    let encoder = info[msg.guild.id].encoder;
    let chan = info[msg.guild.id].boundChannel;
    let options = {
        compressed: true, // sets 'Accept-Encoding' to 'gzip,deflate'
        follow_max: 5,    // follow up to five redirects
        rejectUnauthorized: true  // verify SSL certificate
    };
    if (info[msg.guild.id].link.length === 0) {
        DL.getInfo(info[msg.guild.id].waitMusic[0], (err, vid) => {
            if (err) {
                winston.error(err);
                playSong(bot, msg)
            } else {
                let waitingMusic = needle.get(vid.url, options);
                waitingMusic.on('readable', function () {
                    let chunk;
                    while (chunk = this.read()) {
                        streamable.push(chunk)
                    }
                });
                waitingMusic.on('end', (err) => {
                    streamable.push(null);
                    if (err) {
                        winston.error(err)
                    } else {
                        if (chan.messages[chan.messages.length - 1].author.id === bot.User.id && chan.messages[chan.messages.length - 1].content.startsWith('Now playing')) {
                            chan.messages[chan.messages.length - 1].edit(`Now playing **${vid.title} [${vid.duration}]**`)
                        } else {
                            chan.sendMessage(`Now playing **${vid.title} [${vid.duration}]**`)
                        }
                        streamable.pipe(encoder.stdin);
                        encoder.play();
                        encoder.voiceConnection.getEncoder().setVolume(info[msg.guild.id].volume);
                    }
                })
            }
        })
    } else {
        let req = needle.get(info[msg.guild.id].link[0], options);
        req.on('readable', function () {
            let chunk;
            while (chunk = this.read()) {
                streamable.push(chunk)
            }
        });
        req.on('end', (err) => {
            if (err) {
                winston.error(err)
            } else {
                streamable.push(null);
                if (chan.messages[chan.messages.length - 1].author.id === bot.User.id && chan.messages[chan.messages.length - 1].content.startsWith('Now playing')) {
                    chan.messages[chan.messages.length - 1].edit(`Now playing **${info[msg.guild.id].title[0]} [${info[msg.guild.id].duration[0]}]**`)
                } else {
                    chan.sendMessage(`Now playing **${info[msg.guild.id].title[0]} [${info[msg.guild.id].duration[0]}]**`)
                }
                streamable.pipe(encoder.stdin);
                encoder.play();
                encoder.voiceConnection.getEncoder().setVolume(info[msg.guild.id].volume);
            }
        });
    }
    streamable.on('error', e => {
        //winston.error(e)
        // TO THE.. FUCK THE ERROR.
    });
    encoder.once('end', () => {
            Commands.skip.fn(bot, msg)
    })
}

function shuffleList(array) {
    return new Promise((resolve) => {
        let rand, index = -1,
            length = array.length,
            result = Array(length);
        while (++index < length) {
            rand = Math.floor(Math.random() * (index + 1));
            result[index] = result[rand];
            result[rand] = array[index];
        }
        resolve(result);
    })
}
