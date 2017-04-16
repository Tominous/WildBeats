let winston = require('winston');
require('winston-daily-rotate-file');
let path = require('path');
let util = require('util');
let fs = require('fs');

fs.stat('logs', err => {
    if (err) {
        if (err.code === "ENOENT") {
            fs.mkdir('logs')
        }
    }
});

exports.winston = winston;

let info = new (winston.Logger)({
    colors: {info: 'green'},
    levels: {info: 0},
    transports: [
        new winston.transports.Console({
            level: 'info',
            json: false,
            colorize: true
        }),
        new winston.transports.DailyRotateFile({
            name: 'info',
            level: 'info',
            json: false,
            datePattern: '-yyyy-MM-dd.log',
            filename: process.cwd()+'/logs/info'
        })
    ]
});

let error = new (winston.Logger)({
    colors: {error: 'red'},
    levels: {error: 0},
    transports: [
        new winston.transports.Console({
            level: 'error',
            json: false,
            colorize: true
        }),
        new winston.transports.DailyRotateFile({
            name: 'error',
            level: 'error',
            json: false,
            datePattern: '-yyyy-MM-dd.log',
            filename: process.cwd()+'/logs/errors'
        })
    ]
});

let exception = new (winston.Logger)({
    colors: {exception: 'yellow'},
    levels: {exception: 0},
    transports: [
        new winston.transports.Console({
            level: 'exception',
            handleExceptions: true,
            humanReadableUnhandledException: true,
            json: false,
            colorize: true
        }),
        new winston.transports.DailyRotateFile({
            name: 'file:exceptions',
            level: 'exception',
            json: false,
            datePattern: '-yyyy-MM-dd.log',
            handleExceptions: true,
            humanReadableUnhandledException: true,
            filename: process.cwd()+'/logs/exceptions'
        })
    ]
});

let gateway = new (winston.Logger)({
    colors: {gateway: 'magenta'},
    levels: {gateway: 0},
    transports: [
        new winston.transports.DailyRotateFile({
            name: 'file:gateway',
            level: 'gateway',
            json: false,
            datePattern: '-yyyy-MM-dd.log',
            filename: process.cwd()+'/logs/gateway'
        })
    ]
});

let disconnected = new (winston.Logger)({
    colors: {disconnected: 'cyan'},
    levels: {disconnected: 0},
    transports: [
        new winston.transports.Console({
            level: 'disconnected',
            json: false,
            colorize: true
        }),
        new winston.transports.DailyRotateFile({
            name: 'file:disconnected',
            level: 'disconnected',
            json: false,
            datePattern: '-yyyy-MM-dd.log',
            filename: process.cwd()+'/logs/disconnected'
        })
    ]
});

exports.info = info.info;
exports.error = error.error;
exports.exception = exception.exception;
exports.gateway = gateway.gateway;
exports.disconnected = disconnected.disconnected;

/*
var logger = new (winston.Logger)({
    emitErrs: true,
    colors: {
        info: 'green',
        warn: 'yellow',
        error: 'red',
        debug: 'blue',
        silly: 'blue'
    },
    transports: [
        new winston.transports.Console({
            level: 'verbose',
            json: false,
            handleExceptions: true,
            humanReadableUnhandledException: true,
            colorize: true
        }),
        new winston.transports.DailyRotateFile({
            name: 'file:error',
            level: 'error',
            json: false,
            datePattern: '-yyyy-MM-dd.log',
            filename: path.resolve(__dirname, '..', '..', 'logs/errors')
        }),
        new winston.transports.DailyRotateFile({
            name: 'file:info',
            level: 'info',
            json: false,
            datePattern: '-yyyy-MM-dd.log',
            filename: path.resolve(__dirname, '..', '..', 'logs/info')
        }),
        new winston.transports.DailyRotateFile({
            name: 'file:exceptions',
            level: 'exception',
            json: false,
            datePattern: '-yyyy-MM-dd.log',
            handleExceptions: true,
            humanReadableUnhandledException: true,
            filename: path.resolve(__dirname, '..', '..', 'logs/exceptions')
        })
    ]
});

var custom = new (winston.Logger)({
    emitErrs: true,
    level: 'debug',
    levels: {
        gateway: 0,
        disconnected: 1,
        chatLog: 2,
        voiceJoin: 3,
        voiceLeave: 4,
        debug: 5
    },
    colors: {
        gateway: 'yellow',
        disconnected: 'red',
        chatLog: 'green',
        voiceJoin: 'cyan',
        voiceLeave: 'magenta'
    },
    transports: [
        new winston.transports.Console({
            level: 'debug',
            json: false,
            handleExceptions: true,
            humanReadableUnhandledException: true,
            colorize: true
        }),
        new winston.transports.DailyRotateFile({
            name: 'gateway',
            level: 'gateway',
            json: false,
            datePattern: '-yyyy-MM-dd.log',
            filename: path.resolve(__dirname, '..', '..', 'logs/gateway')
        }),
        new winston.transports.DailyRotateFile({
            name: 'disconnected',
            level: 'disconnected',
            json: false,
            datePattern: '-yyyy-MM-dd.log',
            filename: path.resolve(__dirname, '..', '..', 'logs/disconnected')
        }),
        new winston.transports.DailyRotateFile({
            name: 'chatLog',
            level: 'chatLog',
            json: false,
            datePattern: '-yyyy-MM-dd.log',
            filename: path.resolve(__dirname, '..', '..', 'logs/chatLog')
        }),
        new winston.transports.DailyRotateFile({
            name: 'voiceJoin',
            level: 'voiceJoin',
            json: false,
            datePattern: '-yyyy-MM-dd.log',
            filename: path.resolve(__dirname, '..', '..', 'logs/voiceJoin')
        }),
        new winston.transports.DailyRotateFile({
            name: 'voiceLeave',
            level: 'voiceLeave',
            json: false,
            datePattern: '-yyyy-MM-dd.log',
            filename: path.resolve(__dirname, '..', '..', 'logs/voiceLeave')
        })
    ]
});
*/


