const winston = require('winston');
require('winston-daily-rotate-file');

const { combine, timestamp, json, errors, ms } = winston.format;

const dailyRotateTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/security-%DATE%.json',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d'
});

const errorRotateTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.json',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    level: 'error',
    maxSize: '20m',
    maxFiles: '90d'
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info', // Default to info level in prod
    format: combine(
        errors({ stack: true }),
        timestamp(),
        ms(),
        json() // L3 requirement: Structured Logging
    ),
    transports: [
        dailyRotateTransport,
        errorRotateTransport
    ]
});

// During development, also log to the console
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = logger;
