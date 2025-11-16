/**
 * This is the main entry point for the 'hiro' package.
 * It exports the core building blocks for creating a bot.
 */

import 'reflect-metadata'

export { container } from 'tsyringe'
export { BotClient } from '#core/client'
export type { BotClientOptions } from '#core/client'

export { BaseService } from '#core/service'
export type { ServiceStatus } from '#core/service'

export { BasePlugin } from '#core/plugin'

export { createCommand } from '#core/command'
export type { Command, CommandContext } from '#core/command'

export type { Middleware } from '#core/middleware'

export * from '#core/errors'
export { createLogger } from '#core/logger'
export { createEmbedFactory } from '#utils/embed'
export type { EmbedData } from '#utils/embed'
export { env } from '#core/env'
