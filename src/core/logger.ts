import winston from 'winston'
import { env } from '#core/env'

enum LabelType {
	Process = 'process',
	Client = 'client',
	Manager = 'manager',
	Service = 'service',
	Plugin = 'plugin',
	Command = 'command',
	Middleware = 'middleware',
	ErrorHandler = 'error-handler',
}

enum LogColors {
	Muted = '[38;5;249m',
	Cyan = '[36m',
	Blue = '[94m',
	Yellow = '[93m',
	Magenta = '[95m',
	Green = '[92m',
	BrightWhite = '[97m',
	White = '[37m',
	Reset = '[0m',
}

const getLabelColor = (label: string): LogColors => {
	if (label.startsWith(LabelType.Process)) return LogColors.Green
	if (label.startsWith(LabelType.Client)) return LogColors.BrightWhite
	if (label.startsWith(LabelType.Manager)) return LogColors.Cyan
	if (label.startsWith(LabelType.Service)) return LogColors.Yellow
	if (label.startsWith(LabelType.ErrorHandler)) return LogColors.Yellow
	if (label.startsWith(LabelType.Plugin)) return LogColors.Magenta
	if (label.startsWith(LabelType.Command)) return LogColors.Blue
	if (label.startsWith(LabelType.Middleware)) return LogColors.Muted

	return LogColors.White
}

const consoleFormat = winston.format.printf(
	({ level, message, label, timestamp, stack }) => {
		const logMessage = (stack || message) as string

		const messageColor = level === 'debug' ? LogColors.Muted : LogColors.White
		const timestampColor = LogColors.Muted
		const labelColor = label ? getLabelColor(label as string) : LogColors.White

		const reset = LogColors.Reset

		const ts = `${timestampColor}${timestamp}${reset}`
		const lbl = label ? ` ${labelColor}[${label}]${reset}` : ''

		return `${ts}${lbl} ${level}: ${messageColor}${logMessage}${reset}`
	},
)

class LoggerFactory {
	private root: winston.Logger

	constructor() {
		this.root = winston.createLogger({
			level: env.LOG_LEVEL,
			format: winston.format.combine(
				winston.format.timestamp({ format: 'HH:mm:ss.ms' }),
				winston.format.errors({ stack: true }),
				winston.format.json(),
			),
			transports: [
				new winston.transports.Console({
					format: winston.format.combine(
						winston.format.colorize(),
						consoleFormat,
					),
				}),
				new winston.transports.File({
					filename: 'logs/error.log',
					level: 'error',
				}),
				new winston.transports.File({ filename: 'logs/combined.log' }),
			],
		})
	}

	getLogger(label: string, parent?: string): winston.Logger {
		const fullLabel = parent ? `${parent}:${label}` : label

		return this.root.child({ label: fullLabel })
	}
}

export const loggerFactory = new LoggerFactory()

export const createLogger = (label: string, parent?: string) =>
	loggerFactory.getLogger(label, parent)
