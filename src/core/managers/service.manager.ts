import { err, ok, type Result } from 'neverthrow'
import { container, injectable } from 'tsyringe'
import type winston from 'winston'
import {
	ConnectionError,
	type DisconnectionError,
	RegistrationError,
	ServiceNotFoundError,
} from '#core/errors'
import { createLogger } from '#core/logger'
import type { BaseService, ServiceStatus } from '#core/service'

@injectable()
export class ServiceManager {
	private readonly logger: winston.Logger
	private readonly services = new Map<string, BaseService>()
	private readonly serviceNames: string[] = []

	constructor() {
		this.logger = createLogger('service', 'manager')
	}

	public register(service: BaseService): Result<void, RegistrationError> {
		if (this.services.has(service.name)) {
			return err(
				new RegistrationError(
					`Service with name "${service.name}" is already registered.`,
				),
			)
		}

		this.logger.debug(`Registering service: ${service.name}`)
		this.services.set(service.name, service)
		this.serviceNames.push(service.name)
		container.registerInstance(service.constructor as any, service)
		container.register(service.token, { useValue: service })
		return ok(undefined)
	}

	public async connectAll(): Promise<Result<void, ConnectionError>> {
		for (const name of this.serviceNames) {
			const service = this.services.get(name)!
			this.logger.debug(`Connecting service: ${name}`)
			const result = await service.connect()
			if (result.isErr()) {
				this.logger.error(`Failed to connect service: ${name}`, {
					error: result.error,
				})
				return err(
					new ConnectionError(`Failed to connect service: ${name}`, {
						cause: result.error,
					}),
				)
			}
		}
		this.logger.info('All services connected successfully.')
		return ok(undefined)
	}

	public async disconnectAll(): Promise<Result<void, DisconnectionError>> {
		const reversedServiceNames = [...this.serviceNames].reverse()
		for (const name of reversedServiceNames) {
			const service = this.services.get(name)!
			this.logger.debug(`Disconnecting service: ${name}`)
			const result = await service.disconnect()
			if (result.isErr()) {
				this.logger.warn(`Failed to disconnect service: ${name}`, {
					error: result.error,
				})
			}
		}
		this.logger.info('All services disconnected.')
		return ok(undefined)
	}

	public async getHealth(): Promise<Record<string, ServiceStatus>> {
		const health: Record<string, ServiceStatus> = {}
		for (const name of this.serviceNames) {
			const service = this.services.get(name)!
			const statusResult = await service.getStatus()
			health[name] = statusResult.isOk()
				? statusResult.value
				: {
						connected: false,
						healthy: false,
						metadata: { error: 'Status check failed' },
					}
		}
		return health
	}

	public get(name: string): Result<BaseService, ServiceNotFoundError> {
		const service = this.services.get(name)
		if (!service) {
			return err(new ServiceNotFoundError(`Service "${name}" not found.`))
		}
		return ok(service)
	}
}
