**HIRO** is a modern Discord bot framework based on a modular plug-n-play architecture, offering an optimal DX through dependency injection, a strict typing system, and robust error handling.

---

## 🏗️ Architecture

### Technical Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **DI Container**: TSyringe + Reflect-metadata
- **Validation**: Zod (environment variables)
- **Logging**: Winston (hierarchical loggers)
- **Error Handling**: Neverthrow (Result types)
- **Discord**: Discord.js
- **Database ORM**: Drizzle
- **Cache**: Redis

### Typescript paths

```json
"paths": {
    "#core/*": ["./src/core/*"],
    "#managers/*": ["./src/core/managers/*"],
    "#services/*": ["./src/services/*"],
    "#interfaces/*": ["./src/interfaces/*"],
    "#plugins/*": ["./src/plugins/*"],
    "#commands/*": ["./src/commands/*"],
    "#middlewares/*": ["./src/middlewares/*"],
    "#utils/*": ["./src/utils/*"]
}
```

### Scripts

```json
"scripts": {
    "prepare": "husky",
    "dev": "bun run --watch src/main.ts",
    "start": "bun run src/main.ts",
    "type-check": "tsc --noEmit",
    "check": "biome check",
    "check:fix": "biome check --write",
},
```

### File Structure

```
src/
├── core/
│   ├── client.ts              # BotClient (main orchestrator)
│   ├── managers/
│   │   ├── service.manager.ts # Manages the lifecycle of services
│   │   ├── plugin.manager.ts  # Manages plugin hooks and registry
│   │   └── command.manager.ts # Routes and executes commands
│   ├── env.ts                 # Validated environment variables (Zod)
│   ├── logger.ts              # Logger factory (Winston)
│   ├── command.ts             # Command factory function
│   ├── middleware.ts          # Middleware types and utilities
│   ├── plugin.ts              # BasePlugin abstract class
│   ├── service.ts             # BaseService abstract class
│   └── errors.ts              # Custom error hierarchy
├── commands/                  # Command implementations
├── middlewares/               # Middleware implementations
├── plugins/                   # Plugin implementations
├── services/                  # Service implementations
├── interfaces/                # Service interfaces for DI
├── utils/                     # Utils
├── client.ts                  # BotClient instance
└── main.ts                    # Entry point
```

### Layers

```
┌─────────────────────────────────────────┐
│       PRESENTATION LAYER                │
│   Commands (Discord Interactions)       │
│   → Inject: Services + Plugins          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│       BUSINESS LOGIC LAYER              │
│   Plugins (Domain Logic)                │
│   → Inject: Services only               │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│       INFRASTRUCTURE LAYER              │
│   Services (External Resources)         │
│   → No dependencies                     │
└─────────────────────────────────────────┘
```

**Rules**:

- **Commands** orchestrate **Plugins** and **Services**
- **Plugins** only consume **Services**
- **Services** are autonomous (no dependencies on other services/plugins)

---

## 📦 Core Components

### 1. BotClient

**Role**: Main orchestrator that delegates to specialized managers.
**Responsibilities**:

- Bot initialization and shutdown
- Storing configuration flags (`config: Record<string, unknown>`)
- Coordination between managers
- Global lifecycle management

**Public API**:

```ts
class BotClient extends Client {
  public readonly config: Record<string, unknown>;
  public readonly serviceManager: ServiceManager;
  public readonly pluginManager: PluginManager;
  public readonly commandManager: CommandManager;

  constructor(options: BotClientOptions);

  async start(): Promise<Result<void, StartupError>>;
  async stop(): Promise<Result<void, ShutdownError>>;
  async getHealth(): Promise<HealthCheck>;
}
```

**Logger**: `client`

---

### 2. ServiceManager

**Role**: Manages the lifecycle of services (infrastructure layer).
**Responsibilities**:

- Registry of available services
- Connection/disconnection in sequence
- Health checks for services
- Registration in the DI container

**Public API**:

```ts
class ServiceManager {
  public readonly services: Map<string, BaseService>;

  register(service: BaseService): Result<void, RegistrationError>;

  async connectAll(): Promise<Result<void, ConnectionError>>;
  async disconnectAll(): Promise<Result<void, DisconnectionError>>;

  async getHealth(): Promise<Record<string, ServiceHealth>>;

  get(name: string): Result<BaseService, ServiceNotFoundError>;
}
```

**Logger**: `manager:service`

---

### 3. PluginManager

**Role**: Manages plugins and orchestrates hooks.
**Responsibilities**:

- Registry of plugins
- Triggering hooks in a defined order
- Registration in the DI container
- Health checks for plugins

**Public API**:

```ts
class PluginManager {
  register(plugin: BasePlugin): Result<void, RegistrationError>;

  async triggerHook(
    hookName: PluginHook,
    ...args: unknown[]
  ): Promise<Result<void, PluginError>>;

  async getHealth(): Promise<Record<string, PluginHealth>>;

  get(name: string): Result<BasePlugin, PluginNotFoundError>;
}
```

**Available Hooks** (execution order):

1. `onReady` → All plugins (registration order)
2. `onServiceConnected` → For each connected service
3. `onClientReady` → All plugins (registration order)
4. `onError` → Triggered on runtime errors
5. `onCommandExecuted` → After each command execution
6. `onBeforeDestroy` → All plugins (reverse order)
7. `onDestroy` → All plugins (reverse order)

**Logger**: `manager:plugin`

---

### 4. CommandManager

**Role**: Routes Discord interactions and executes commands with middlewares.
**Responsibilities**:

- Registry of commands
- Routing interaction → command
- Execution of the middleware pipeline
- Management of the execution context

**Public API**:

```ts
class CommandManager {
  public readonly commandsMetadata: { name: string; description: string }[];

  register(command: Command): Result<void, RegistrationError>;

  async handleInteraction(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<Result<void, CommandError>>;

  get(name: string): Result<Command, CommandNotFoundError>;
}
```

**Logger**: `manager:command`

---

## 🧩 Core Building Blocks

### 1) `BaseService`

**Location**: `./src/core/service.ts`
**Usage**: Classes in `./src/services/<name>.service.ts`

**Responsibilities**:

- Abstraction of external resources (DB, API, Cache, etc.)
- Connection/disconnection management
- Provides a health status

**Interface**:

```ts
abstract class BaseService {
  abstract readonly name: string;
  abstract readonly token: symbol;
  protected logger: winston.Logger;

  constructor();

  abstract connect(): Promise<Result<void, ConnectionError>>;
  abstract disconnect(): Promise<Result<void, DisconnectionError>>;
  abstract getStatus(): Promise<Result<ServiceStatus, StatusError>>;
}

interface ServiceStatus {
  connected: boolean;
  healthy: boolean;
  metadata?: Record<string, unknown>;
}
```

**Injection**: Injectable in **Plugins** and **Commands** via its interface token (e.g., `IDatabaseService`).

**Logger**: `service:<name>`

**Example**:

```ts
@singleton()
export class DatabaseService extends BaseService implements IDatabaseService {
  readonly name = "database";
  readonly token = IDatabaseService;
  private _db: BunSQLDatabase | undefined;

  get db(): BunSQLDatabase {
    // ...
  }

  async connect(): Promise<Result<void, ConnectionError>> {
    // ...
  }

  async disconnect(): Promise<Result<void, DisconnectionError>> {
    // ...
  }

  async getStatus(): Promise<Result<ServiceStatus, StatusError>> {
    // ...
  }
}
```

### 2) `BasePlugin`

**Location**: `./src/core/plugin.ts`
**Usage**: Classes in `./src/plugins/<name>.plugin.ts`

**Responsibilities**:

- Implementation of business logic
- Reaction to bot events via hooks
- Consumption of services

**Interface**:

```ts
abstract class BasePlugin {
  abstract readonly name: string;
  protected logger: winston.Logger;

  constructor();

  // Optional Hooks
  onReady?(): Promise<Result<void, PluginError>>;
  onClientReady?(): Promise<Result<void, PluginError>>;
  onServiceConnected?(service: BaseService): Promise<Result<void, PluginError>>;
  onError?(error: BaseError): Promise<Result<void, PluginError>>;
  onCommandExecuted?(
    commandName: string,
    result: Result<unknown, BaseError>
  ): Promise<void>;
  onBeforeDestroy?(): Promise<Result<void, PluginError>>;
  onDestroy?(): Promise<Result<void, PluginError>>;
}
```

**Injection**:

- Can inject **Services**
- Injectable in **Commands** and other **Plugins**

**Logger**: `plugin:<name>`

### 3) `Command`

**Location**: `./src/core/command.ts`
**Usage**: Files in `./src/commands/<name>.command.ts` using the `createCommand` factory.

**Responsibilities**:

- Definition of a Discord slash command
- Execution of logic with an enriched context
- Support for middlewares

**Interface**:

```ts
interface Command {
  data: {
    name: string;
    description: string;
  };
  run: (ctx: CommandContext) => Promise<Result<void, CommandError>>;
  middlewares?: Middleware[];
}

const createCommand = (command: Command): Command => command;
```

**CommandContext**:

```ts
interface CommandContext {
  interaction: ChatInputCommandInteraction;
  client: BotClient;
  container: typeof container;
  metadata: TypedMetadata;
}
```

**Injection**: Services and Plugins can be resolved from the `container` inside the `run` function.

**Logger**: `command:<name>` (Handled by middlewares like `loggerMiddleware`)

**Example**:

```ts
import { ok } from "neverthrow";
import { createCommand } from "#core/command";
import {
  IDatabaseService,
  type IDatabaseService as IDatabaseServiceType,
} from "#interfaces/database";
import { createEmbed } from "#utils/embed";

export const db = createCommand({
  data: {
    name: "db",
    description: "Test the database connection.",
  },
  run: async ({ interaction, container }) => {
    const db = container.resolve<IDatabaseServiceType>(IDatabaseService);
    const result = await db.getStatus();

    if (result.isErr()) {
      const embed = createEmbed({
        level: "error",
        title: "Database connection failed",
        description: result.error.message,
      });
      await interaction.reply({
        embeds: [embed],
      });
      return ok(undefined);
    }

    const embed = createEmbed({
      level: "success",
      title: "Database connection successful",
      description: `Database status: ${JSON.stringify(result.value)}`,
    });

    await interaction.reply({
      embeds: [embed],
    });

    return ok(undefined);
  },
});
```

### 4) Middlewares

**Location**:

- Types/utils: `./src/core/middleware.ts`
- Implementations: `./src/middlewares/<name>.middleware.ts`

**Responsibilities**:

- Validation, permission checks, rate limiting, logging, etc.
- Context enrichment
- Short-circuiting execution (early return)

**Signature**:

```ts
type Middleware = (
  ctx: CommandContext,
  next: () => Promise<Result<void, MiddlewareError>>
) => Promise<Result<void, MiddlewareError>>;
```

**Execution Pattern**:

- Middlewares are executed in the order they are added.
- Call `next()` to continue the chain.
- Return without calling `next()` to short-circuit.

**Logger**: `middleware:<name>`

### 5) `createEmbed`

**Location**: `./src/utils/embed.ts`
**Usage**: `createEmbed(options)`

**Responsibilities**:

- Creates a standardized `EmbedBuilder` instance.
- Automatically sets a color based on the embed level (`info`, `success`, `warning`, `error`).

**Interface**:

```ts
function createEmbed(options: {
  level: "info" | "success" | "warning" | "error";
  title: string;
  description?: string;
  fields?: { name: string; value: string }[];
}): EmbedBuilder;
```

**Example**:

```ts
import { createEmbed } from "#utils/embed";

const embed = createEmbed({
  level: "success",
  title: "Success!",
  description: "The operation was successful.",
});
```

---

## ⛔️ Error Handling

### Error Hierarchy

**BaseError**:

```ts
// ./src/core/errors.ts
export abstract class BaseError extends Error {
  public readonly timestamp: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      context?: Record<string, unknown>;
    }
  );

  toJSON(): Record<string, unknown>;
}
```

**Specific Error Types**:

```ts
// Startup/Shutdown Errors
export class StartupError extends BaseError {}
export class ShutdownError extends BaseError {}
export class RegistrationError extends BaseError {}

// Service Errors
export class ConnectionError extends BaseError {}
export class DisconnectionError extends BaseError {}
export class StatusError extends BaseError {}
export class ServiceNotFoundError extends BaseError {}

// Plugin Errors
export class PluginError extends BaseError {}
export class PluginNotFoundError extends BaseError {}

// Command Errors
export class CommandError extends BaseError {}
export class CommandNotFoundError extends BaseError {}

// Middleware Errors
export class MiddlewareError extends BaseError {}

// Business Logic Errors
export class ValidationError extends BaseError {}
export class AuthorizationError extends BaseError {}
export class RateLimitError extends BaseError {}
```

### Global Error Handler

**Role**: Centralizes the handling of uncaught errors.
**Usage**: Internal use only.

```ts
// ./src/core/error_handler.ts
export class GlobalErrorHandler {
  handle(error: BaseError, context: ErrorContext): void;
  handleFatal(error: Error): never;
}
```

### Result Pattern Usage

**All methods** should return `Result<T, E>`:

```ts
import { Result, ok, err } from 'neverthrow';

// ✅ Instance method
async connect(): Promise<Result<void, ConnectionError>> {
  try {
    await this.client.connect();
    return ok(undefined);
  } catch (error) {
    return err(new ConnectionError('Connection failed', { cause: error }));
  }
}

// ✅ Composing Results
async execute(ctx: CommandContext): Promise<Result<void, CommandError>> {
  const userResult = await this.getUser(ctx.interaction.user.id);

  if (userResult.isErr()) {
    return err(new CommandError('User not found', { cause: userResult.error }));
  }

  // ...
  return ok(undefined);
}
```

---

## 📝 Logger

**Role**: Creates hierarchical loggers with automatic context.

```ts
// ./src/core/logger.ts
class LoggerFactory {
  getLogger(label: string, parent?: string): winston.Logger;
}

export const createLogger = (label: string, parent?: string) =>
  loggerFactory.getLogger(label, parent);
```

#### Logger Labels

| **Component**  | **Label**           | **Example**                                 |
| -------------- | ------------------- | ------------------------------------------- |
| BotClient      | `client`            | `[client] Bot starting...`                  |
| ServiceManager | `manager:service`   | `[manager:service] Connecting all services` |
| PluginManager  | `manager:plugin`    | `[manager:plugin] Triggering onReady hook`  |
| CommandManager | `manager:command`   | `[manager:command] Routing interaction`     |
| Service        | `service:<name>`    | `[service:database] Connected successfully` |
| Plugin         | `plugin:<name>`     | `[plugin:moderation] Processing ban`        |
| Command        | `command:<name>`    | `[command:ban] Executing command`           |
| Middleware     | `middleware:<name>` | `[middleware:rate-limit] User rate limited` |
| ErrorHandler   | `error-handler`     | `[error-handler] Unhandled plugin error`    |
| Process        | `process`           | `[process] Starting HIRO bot...`            |

---

## 🔧 Configuration

### Environment Variables

**File**: `./src/core/env.ts`
**Validation**: Zod with strict parsing (fatal error if invalid).

```ts
import { z } from "zod";

const EnvSchema = z.object({
  // global
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // discord
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),

  // logger
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

  // services
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
});

export const env = loadEnv();
```

### Configuration Flags

**Storage**: `BotClient.config` (`Record<string, unknown>`)
**Usage**: Runtime flags that can be modified without restarting.

```ts
// Initialization in ./src/client.ts
const client = new BotClient({
  // ...
  config: {
    features: {
      automod: true,
    },
  },
});
```

---

## 🏥 Health Checks

### Structure

```ts
interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  version: string;
  services: Record<string, ServiceStatus>;
  plugins: Record<string, PluginHealth>;
}

interface ServiceHealth {
  connected: boolean;
  healthy: boolean;
  metadata?: Record<string, unknown>;
}

interface PluginHealth {
  loaded: boolean;
  healthy: boolean;
  metadata?: Record<string, unknown>;
}
```

**Implementation**: The `BotClient.getHealth()` method aggregates health data from the `ServiceManager` and `PluginManager`.

---

## 🚀 Lifecycle

### Entry Point

```ts
// ./src/main.ts
async function main() {
  // ...
  const startResult = await client.start();
  // ...
  // Graceful shutdown logic
}

main().catch(/* ... */);
```

### Startup Sequence

1.  Load and validate environment variables.
2.  Initialize `BotClient` and managers.
3.  Register all services, plugins, and commands with their respective managers and the DI container.
4.  Connect all services (`ServiceManager.connectAll()`).
5.  Trigger `onServiceConnected` hooks in plugins.
6.  Log in to Discord.
7.  Trigger `onReady` hooks.
8.  Wait for Discord's `ClientReady` event.
9.  Trigger `onClientReady` hooks.
10. Register slash commands with Discord.
11. Bot is ready.

### Shutdown Sequence

1.  Receive shutdown signal (SIGINT, SIGTERM).
2.  Trigger `onBeforeDestroy` and `onDestroy` hooks in plugins (reverse order).
3.  Disconnect all services (`ServiceManager.disconnectAll()`) (reverse order).
4.  Log out from Discord.
5.  Exit the process.
