const config = require('../config.json');
const Songs = require('./songs.json');
const DL = require('youtube-dl');
let winston = require('../runtime/winston.js');
let needle = require('needle');
let Commands = [];
let info = {};

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
                    waitMusic: [],
                    waitTitle: undefined,
                    waitDuration: 0
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
                fetch(bot, msg, suffix);
            } else {
                fetch(bot, msg, `ytsearch:${suffix}`);
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
                        info[msg.guild.id].skipping = setTimeout(function () {
                            playSong(bot, msg);
                        }, 2500)
                    })
                } else {
                    info[msg.guild.id].waitMusic.shift();
                    info[msg.guild.id].skipping = setTimeout(function () {
                        playSong(bot, msg);
                    }, 2500)
                }
            } else {
                info[msg.guild.id].duration.shift();
                info[msg.guild.id].link.shift();
                info[msg.guild.id].requester.shift();
                info[msg.guild.id].title.shift();
                info[msg.guild.id].id.shift();
                info[msg.guild.id].skipping = setTimeout(function () {
                    playSong(bot, msg);
                }, 2500)
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
                    arr.push(`${i}. **${info[msg.guild.id].title[i]}** requested by _${msg.guild.members.find(m => m.id === info[msg.guild.id].requester[i]).username}_`);
                    if (i === 9) {
                        arr.push(info[msg.guild.id].title.length - 10 > 0 ? `And about ${info[msg.guild.id].title.length - 10} more songs.` : null);
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

Commands.timeleft = {
    name: 'timeleft',
    aliases: ['tl', 'nowplaying', 'current', 'np'],
    help: 'Show the current track time compared to total duration..',
    fn: function (bot, msg) {
        let voiceCon = bot.VoiceConnections.find(o => o.voiceConnection.guild.id === msg.guild.id);
        if (info[msg.guild.id].boundChannel.id === msg.channel.id && voiceCon) {
            if (info[msg.guild.id].link.length === 0) {
                msg.channel.sendMessage(`**Current song:** _${info[msg.guild.id].waitTitle}_\n:arrow_forward: ${progressBar(Math.round((info[msg.guild.id].encoder._encoderStream.timestamp / info[msg.guild.id].waitDuration) * 8))} **[${hhMMss(info[msg.guild.id].encoder._encoderStream.timestamp)}/${hhMMss(info[msg.guild.id].waitDuration)}]**`)
            } else {
                msg.channel.sendMessage(`**Current song:** _${info[msg.guild.id].title[0]}_\n**Requested by:** _${msg.guild.members.find(c => c.id === info[msg.guild.id].requester[0]).username}_\n:arrow_forward: ${progressBar(Math.round((info[msg.guild.id].encoder._encoderStream.timestamp / info[msg.guild.id].duration[0]) * 8))} **[${hhMMss(info[msg.guild.id].encoder._encoderStream.timestamp)}/${hhMMss(info[msg.guild.id].duration[0])}]**`)
            }
        }
        function progressBar(percent) {
            let str = "";
            for (let i = 0; i < 8; i++) {
                if (i == percent)
                    str += "\uD83D\uDD18";
                else
                    str += "▬";
            }
            return str;
        }
    }
};

Commands.remove = {
    name: 'remove',
    aliases: ['delete'],
    help: 'Remove a queued song by number or from a user.',
    fn: function (bot, msg, suffix) {
        if (info[msg.guild.id].boundChannel.id === msg.channel.id && info[msg.guild.id].title.length > 1) {
            if (suffix && msg.mentions.length >= 1) {
                winston.info('This is for mentions')
            } else if (suffix) {
                if (suffix === '0') {
                    msg.reply('You cannot remove the current playing song, use skip instead.')
                } else if (suffix.includes('-')) {
                    let arr = suffix.split('-');
                    if (arr[0] < 1 || arr[1] > info[msg.guild.id].title.length) {
                        msg.reply('error message, i\'m lazy.')
                    } else {
                        info[msg.guild.id].title.splice(arr[0], arr[1]);
                        info[msg.guild.id].link.splice(arr[0], arr[1]);
                        info[msg.guild.id].id.splice(arr[0], arr[1]);
                        info[msg.guild.id].requester.splice(arr[0], arr[1]);
                        info[msg.guild.id].duration.splice(arr[0], arr[1]);
                        msg.channel.sendMessage(`Tracks ${arr[0]} through ${arr[1]} have been removed from the playlist.`)
                    }
                } else {
                    let trackName = info[msg.guild.id].title[suffix];
                    info[msg.guild.id].title.splice(suffix, suffix);
                    info[msg.guild.id].link.splice(suffix, suffix);
                    info[msg.guild.id].id.splice(suffix, suffix);
                    info[msg.guild.id].requester.splice(suffix, suffix);
                    info[msg.guild.id].duration.splice(suffix, suffix);
                    msg.channel.sendMessage(`Track ${trackName} has been removed from the playlist.`)
                }
            } else {
                winston.info('no suffix, tell person how to use command.')
            }
        } else {
            msg.reply('The playlist is currently empty, request some songs!')
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
                playSong(bot, msg);
            } else {
                info[msg.guild.id].link.push(i.url);
                info[msg.guild.id].title.push(i.title);
                info[msg.guild.id].id.push(i.id);
                info[msg.guild.id].duration.push(i.duration);
                info[msg.guild.id].requester.push(msg.author.id);
                info[msg.guild.id].boundChannel.sendMessage(`Added **${i.title} [${hhMMss(i.duration)}]** to the queue`)
            }
        }
    });
}

function playSong(bot, msg) {
    info[msg.guild.id].streamable = require('stream').Readable();
    let streamable = info[msg.guild.id].streamable;
    let encoder = bot.VoiceConnections.find(v => v.voiceConnection.guild.id === msg.guild.id).voiceConnection.createExternalEncoder({
        type: 'ffmpeg',
        format: 'pcm',
        source: '-',
        inputArgs: ["-rtbufsize", "25M"],
        debug: true
    });
    info[msg.guild.id].encoder = encoder;
    let chan = info[msg.guild.id].boundChannel;
    let options = {
        compressed: true, // sets 'Accept-Encoding' to 'gzip,deflate'
        follow_max: 5,    // follow up to five redirects
        rejectUnauthorized: true  // verify SSL certificate
    };
    if (info[msg.guild.id].link.length === 0) {
        DL.getInfo(info[msg.guild.id].waitMusic[0], ['--verbose', '--skip-download', '-f bestaudio/worstaudio'], (err, vid) => {
            if (err) {
                winston.error(err);
                playSong(bot, msg)
            } else {
                let waitingMusic = needle.get(vid.url, options);
                info[msg.guild.id].waitTitle = vid.title;
                info[msg.guild.id].waitDuration = vid.duration;
                waitingMusic.on('readable', function () {
                    let chunk;
                    while (chunk = this.read()) {
                        streamable.push(chunk)
                    }
                });
                waitingMusic.on('end', (err) => {
                    if (err) {
                        winston.error(err)
                    } else {
                        streamable.push(null);
                        if (chan.messages[chan.messages.length - 1].author.id === bot.User.id && chan.messages[chan.messages.length - 1].content.startsWith('Now playing')) {
                            chan.messages[chan.messages.length - 1].edit(`Now playing **${vid.title} [${hhMMss(vid.duration)}]**`)
                        } else {
                            chan.sendMessage(`Now playing **${vid.title} [${hhMMss(vid.duration)}]**`)
                        }
                        streamable.pipe(encoder.stdin);
                        encoder.play();
                        encoder._encoderStream.resetTimestamp();
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
                    chan.messages[chan.messages.length - 1].edit(`Now playing **${info[msg.guild.id].title[0]} [${hhMMss(info[msg.guild.id].duration[0])}]**`)
                } else {
                    chan.sendMessage(`Now playing **${info[msg.guild.id].title[0]} [${hhMMss(info[msg.guild.id].duration[0])}]**`)
                }
                streamable.pipe(encoder.stdin);
                encoder.play();
                encoder._encoderStream.resetTimestamp();
                encoder.voiceConnection.getEncoder().setVolume(info[msg.guild.id].volume);
            }
        });
    }
    streamable.on('error', e => {
        //winston.error(e)
        // TO THE.. FUCK THE ERROR.
    });
    encoder.once('end', () => {
        encoder._encoderStream.resetTimestamp();
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

function hhMMss(time) {
    let hours = (Math.floor(time / ((60 * 60)) % 24));
    let minutes = (Math.floor(time / (60)) % 60);
    let seconds = (Math.floor(time) % 60);
    let parsedTime = [];
    hours >= 1 ? parsedTime.push(hours) : null;
    minutes >= 10 ? parsedTime.push(minutes) : parsedTime.push(`0${minutes}`);
    seconds >= 10 ? parsedTime.push(seconds) : parsedTime.push(`0${seconds}`);
    return parsedTime.join(':')
}