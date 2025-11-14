**HIRO** est un framework Discord bot moderne basé sur une architecture modulaire plug-n-play, offrant une DX optimale grâce à l'injection de dépendances, un système de typage strict et une gestion d'erreurs robuste.

---

## 🏗️ Architecture

### Stack Technique

- **Runtime** : Bun
- **Langage** : TypeScript
- **DI Container** : TSyringe + Reflect-metadata
- **Validation** : Zod (variables d'environnement)
- **Logging** : Winston (loggers hiérarchiques)
- **Error Handling** : Neverthrow (Result types)
- **Discord** : Discord.js

### Typescript paths

```json
"paths": {
			"#core/*": ["./src/core/*"],
			"#managers/*": ["./src/core/managers/*"],
			"#services/*": ["./src/services/*"],
			"#plugins/*": ["./src/plugins/*"],
			"#commands/*": ["./src/commands/*"],
			"#middlewares/*": ["./src/middlewares/*"]
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
		"service:create": "bun run scripts/create_service",
		"plugin:create": "bun run scripts/create_plugin",
		"command:create": "bun run scripts/create_command"
	},
```

### Arborescence

```
src/
├── core/
│   ├── client.ts              # BotClient (orchestrateur principal)
│   ├── managers/
│   │   ├── service.manager.ts # Gestion du cycle de vie des services
│   │   ├── plugin.manager.ts  # Gestion des hooks et registry des plugins
│   │   └── command.manager.ts # Routing et exécution des commandes
│   ├── error_handler.ts       # Gestionnaire global d'erreurs
│   ├── env.ts                 # Variables d'environnement validées (Zod)
│   ├── logger.ts              # Logger factory (Winston)
│   ├── decorators.ts          # Décorateurs de middlewares
│   ├── command.ts             # BaseCommand abstract class
│   ├── middleware.ts          # Types et utilitaires middlewares
│   ├── plugin.ts              # BasePlugin abstract class
│   ├── service.ts             # BaseService abstract class
│   └── errors.ts              # Hiérarchie des erreurs customisées
├── commands/                  # Implémentations des commandes
├── middlewares/               # Implémentations des middlewares
├── plugins/                   # Implémentations des plugins
├── services/                  # Implémentations des services
├── client.ts                  # Instance du BotClient
└── main.ts                    # Point d'entrée
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

**Règles** :

- Les **Commands** orchestrent les **Plugins** et **Services**
- Les **Plugins** consomment uniquement des **Services**
- Les **Services** sont autonomes (pas de dépendances)

---

## 📦 Core composants

### 1. BotClient

**Rôle** : Orchestrateur principal qui délègue aux managers spécialisés.
**Responsabilités** :

- Initialisation et shutdown du bot
- Stockage des flags de configuration (`config: Record<string, unknown>`)
- Coordination entre les managers
- Gestion du cycle de vie global

**API Publique** :

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

**Logger** : `global`

---

### 2. ServiceManager

**Rôle** : Gestion du cycle de vie des services (infrastructure layer).
**Responsabilités** :

- Registry des services disponibles
- Connexion/déconnexion en cascade
- Health checks des services
- Enregistrement dans le DI container

**API Publique** :

```ts
class ServiceManager {
  register(service: Service): Result<void, RegistrationError>;

  async connectAll(): Promise<Result<void, ConnectionError>>;
  async disconnectAll(): Promise<Result<void, DisconnectionError>>;

  async getHealth(): Promise<Record<string, ServiceHealth>>;

  get(name: string): Result<Service, ServiceNotFoundError>;
}
```

**Logger** : `manager:service`

---

### 3. PluginManager

**Rôle** : Gestion des plugins et orchestration des hooks.
**Responsabilités** :

- Registry des plugins
- Déclenchement des hooks dans l'ordre défini
- Enregistrement dans le DI container
- Health checks des plugins

**API Publique** :

```ts
class PluginManager {
  register(plugin: Plugin): Result<void, RegistrationError>;

  async triggerHook(
    hookName: PluginHook,
    ...args: unknown[]
  ): Promise<Result<void, PluginError>>;

  async getHealth(): Promise<Record<string, PluginHealth>>;

  get(name: string): Result<Plugin, PluginNotFoundError>;
}
```

**Hooks disponibles** (ordre d'exécution) :

1. `onReady` → Tous les plugins (ordre d'enregistrement)
2. `onServiceConnected` → Pour chaque service connecté
3. `onClientReady` → Tous les plugins (ordre d'enregistrement)
4. `onError` → Déclenché en cas d'erreur runtime
5. `onCommandExecuted` → Après chaque exécution de commande
6. `onBeforeDestroy` → Tous les plugins (ordre inverse)
7. `onDestroy` → Tous les plugins (ordre inverse)

**Logger** : `manager:plugin`

---

### 4. CommandManager

**Rôle** : Routing des interactions Discord et exécution des commandes avec middlewares.
**Responsabilités** :

- Registry des commandes
- Routing interaction → commande
- Exécution du pipeline de middlewares
- Gestion du contexte d'exécution

**API Publique** :

```ts
class CommandManager {
  register(command: BaseCommand): Result<void, RegistrationError>;

  async handleInteraction(
    interaction: ChatInputCommandInteraction
  ): Promise<Result<void, CommandError>>;

  get(name: string): Result<BaseCommand, CommandNotFoundError>;
}
```

**Logger** : `manager:command`

---

## 🧩 Classes de base

### 1) `BaseService`

**Localisation** : `./src/core/service.ts`
**Utilisation** : Classes dans `./src/services/<name>.service.ts`

**Responsabilités** :

- Abstraction des ressources externes (DB, API, Cache, etc.)
- Gestion de la connexion/déconnexion
- Fournit un status de santé

**Interface** :

```ts
abstract class BaseService {
  abstract readonly name: string;
  protected logger: winston.Logger;

  constructor();

  abstract connect(): Promise<Result<void, ConnectionError>>;
  abstract disconnect(): Promise<Result<void, DisconnectionError>>;
  abstract getStatus(): Result<ServiceStatus, StatusError>;
}

interface ServiceStatus {
  connected: boolean;
  healthy: boolean;
  metadata?: Record<string, unknown>;
}
```

**Injection** : Injectable dans les **Plugins** et **Commands** via TSyringe.

**Logger** : `service:<name>`

**Exemple** :

```ts
@injectable()
export class DatabaseService extends BaseService {
  readonly name = "database";
  private connection?: Connection;

  async connect(): Promise<Result<void, ConnectionError>> {
    try {
      this.connection = await createConnection(env.DATABASE_URL);
      this.logger.info("Connected to database");
      return ok(undefined);
    } catch (error) {
      return err(new ConnectionError("Failed to connect", { cause: error }));
    }
  }

  async disconnect(): Promise<Result<void, DisconnectionError>> {
    // Implementation
  }

  getStatus(): Result<ServiceStatus, StatusError> {
    return ok({
      connected: !!this.connection,
      healthy: this.connection?.isHealthy() ?? false,
    });
  }
}
```

### 2) `BasePlugin`

**Localisation** : `./src/core/plugin.ts`
**Utilisation** : Classes dans `./src/plugins/<name>.plugin.ts`

**Responsabilités** :

- Implémentation de la logique métier
- Réaction aux événements du bot via hooks
- Consommation de services

**Interface** :

```ts
abstract class BasePlugin {
  abstract readonly name: string;
  protected logger: winston.Logger;

  constructor();

  // Hooks optionnels
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

**Injection** :

- Peut injecter des **Services**
- Injectable dans les **Commands** et autres **Plugins**

**Logger** : `plugin:<name>`

**Exemple** :

```ts
@injectable()
export class ModerationPlugin extends BasePlugin {
  readonly name = "moderation";

  constructor(@inject(DatabaseService) private db: DatabaseService) {
    super();
  }

  async onReady(): Promise<Result<void, PluginError>> {
    this.logger.info("Moderation plugin ready");
    return ok(undefined);
  }

  async onCommandExecuted(
    commandName: string,
    result: Result<unknown, BaseError>
  ): Promise<void> {
    if (result.isErr()) {
      this.logger.warn(`Command \${commandName} failed`, {
        error: result.error,
      });
    }
  }

  async ban(
    userId: string,
    reason: string
  ): Promise<Result<void, ModerationError>> {
    // Business logic
  }
}
```

### 3) `BaseCommand`

**Localisation** : `./src/core/command.ts`
**Utilisation** : Classes dans `./src/commands/<name>.command.ts`

**Responsabilités** :

- Définition d'une commande Discord (slash command)
- Exécution de la logique avec contexte enrichi
- Support des middlewares via décorateurs

**Interface** :

```ts
abstract class BaseCommand {
  abstract readonly name: string;
  abstract readonly description: string;
  protected logger: winston.Logger;

  constructor();

  // Builder Discord.js
  abstract buildCommand(): SlashCommandBuilder;

  // Méthode abstraite à implémenter
  abstract execute(ctx: CommandContext): Promise<Result<void, CommandError>>;

  // Méthode interne (ne pas override)
  async _execute(
    interaction: ChatInputCommandInteraction,
    client: BotClient
  ): Promise<Result<void, CommandError>>;

  // Enregistrement de middlewares custom
  use(middleware: Middleware): void;
}
```

**CommandContext** :

```ts
interface CommandContext {
  interaction: ChatInputCommandInteraction;
  client: BotClient;
  metadata: TypedMetadata; // Map typée pour le partage entre middlewares
}

class TypedMetadata {
  set<T>(key: string, value: T): void;
  get<T>(key: string): T | undefined;
  has(key: string): boolean;
  delete(key: string): boolean;
}
```

**Injection** : Peut injecter des **Services** et **Plugins** via TSyringe.

**Logger** : `command:<name>`

**Exemple** :

```ts
@injectable()
export class BanCommand extends BaseCommand {
  readonly name = "ban";
  readonly description = "Ban a user from the server";

  constructor(@inject(ModerationPlugin) private moderation: ModerationPlugin) {
    super();
  }

  buildCommand(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addUserOption((option) =>
        option.setName("user").setDescription("User to ban").setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Reason for ban")
          .setRequired(false)
      );
  }

  @RequireRole("admin")
  @RateLimit({ max: 3, window: 60 })
  @Log()
  async execute(ctx: CommandContext): Promise<Result<void, CommandError>> {
    const user = ctx.interaction.options.getUser("user", true);
    const reason =
      ctx.interaction.options.getString("reason") ?? "No reason provided";

    const result = await this.moderation.ban(user.id, reason);

    if (result.isErr()) {
      return err(
        new CommandError("Failed to ban user", { cause: result.error })
      );
    }

    await ctx.interaction.reply({
      content: `Successfully banned ${user.tag}`,
      ephemeral: true,
    });

    return ok(undefined);
  }
}
```

### 4) Middlewares

**Localisation** :

- Types/utils : `./src/core/middleware.ts`
- Implémentations : `./src/middlewares/<name>.middleware.ts`

**Responsabilités** :

- Validation, vérification de permissions, rate limiting, logging, etc.
- Enrichissement du contexte
- Court-circuitage de l'exécution (early return)

**Signature** :

```ts
type Middleware = (
  ctx: CommandContext,
  next: () => Promise<Result<void, MiddlewareError>>
) => Promise<Result<void, MiddlewareError>>;
```

**Pattern d'exécution** :

- Les middlewares sont exécutés dans l'ordre de déclaration (top → bottom)
- Appel de `next()` pour continuer la chaîne
- Return sans appeler `next()` pour court-circuiter

**Logger** : `middleware:<name>`

**Exemple - Décorateur** :

```ts
// ./src/decorators.ts
export function RequireRole(role: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (ctx: CommandContext) {
      const middleware: Middleware = async (ctx, next) => {
        const member = ctx.interaction.member as GuildMember;

        if (!member.roles.cache.some((r) => r.name === role)) {
          return err(new MiddlewareError(`Missing role: ${role}`));
        }

        return next();
      };

      // Enregistrement du middleware
      this.use(middleware);

      return originalMethod.call(this, ctx);
    };

    return descriptor;
  };
}
```

**Exemple - Implémentation standalone** :

```ts
// ./src/middlewares/rate-limit.middleware.ts
export const createRateLimitMiddleware = (options: {
  max: number;
  window: number;
}): Middleware => {
  const cache = new Map<string, { count: number; resetAt: number }>();

  return async (ctx, next) => {
    const userId = ctx.interaction.user.id;
    const now = Date.now();

    let entry = cache.get(userId);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + options.window * 1000 };
      cache.set(userId, entry);
    }

    if (entry.count >= options.max) {
      return err(new MiddlewareError("Rate limit exceeded"));
    }

    entry.count++;

    // Enrichir le contexte
    ctx.metadata.set("rateLimit", {
      remaining: options.max - entry.count,
      resetAt: entry.resetAt,
    });

    return next();
  };
};
```

---

## ⛔️ Error handling

### Hiérarchie des erreurs

**BaseError** :

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
  ) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.timestamp = Date.now();
    this.context = options?.context;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp,
      context: this.context,
      cause:
        this.cause instanceof BaseError
          ? this.cause.toJSON()
          : String(this.cause),
    };
  }
}
```

**Types d'erreurs spécifiques** :

```ts
// Erreurs de démarrage
export class StartupError extends BaseError {}
export class ShutdownError extends BaseError {}
export class RegistrationError extends BaseError {}

// Erreurs de services
export class ConnectionError extends BaseError {}
export class DisconnectionError extends BaseError {}
export class StatusError extends BaseError {}

// Erreurs de plugins
export class PluginError extends BaseError {}
export class PluginNotFoundError extends BaseError {}

// Erreurs de commandes
export class CommandError extends BaseError {}
export class CommandNotFoundError extends BaseError {}

// Erreurs de middlewares
export class MiddlewareError extends BaseError {}

// Erreurs business
export class ValidationError extends BaseError {}
export class AuthorizationError extends BaseError {}
export class RateLimitError extends BaseError {}
```

### Global error handler

**Rôle** : Centraliser la gestion des erreurs non catchées.
**Utilisation** : Usage interne uniquement (pas d'interaction avec Discord).

```ts
// ./src/core/error_handler.ts
interface ErrorContext {
  component: "service" | "plugin" | "command" | "middleware" | "client";
  name?: string;
  metadata?: Record<string, unknown>;
}

export class GlobalErrorHandler {
  private logger: winston.Logger;

  constructor() {
    this.logger = createLogger("error-handler");
  }

  handle(error: BaseError, context: ErrorContext): void {
    this.logger.error("Unhandled error", {
      error: error.toJSON(),
      context,
      stack: error.stack,
    });

    // Potentiellement : envoyer à un service de monitoring externe
  }

  handleFatal(error: Error): never {
    this.logger.error("Fatal error - shutting down", {
      error: error.message,
      stack: error.stack,
    });

    process.exit(1);
  }
}
```

### Pattern d'utilisation de Result

**Toutes les méthodes** retournent `Result<T, E>` :

```ts
import { Result, ok, err } from 'neverthrow';

// ✅ Méthode instance
async connect(): Promise<Result<void, ConnectionError>> {
  try {
    await this.client.connect();
    return ok(undefined);
  } catch (error) {
    return err(new ConnectionError('Connection failed', { cause: error }));
  }
}

// ✅ Méthode static
static create(options: Options): Result<DatabaseService, ConfigError> {
  const validation = OptionsSchema.safeParse(options);

  if (!validation.success) {
    return err(new ConfigError('Invalid options', {
      context: { errors: validation.error.errors },
    }));
  }

  return ok(new DatabaseService(validation.data));
}

// ✅ Composition de Results
async execute(ctx: CommandContext): Promise<Result<void, CommandError>> {
  const userResult = await this.getUser(ctx.interaction.user.id);

  if (userResult.isErr()) {
    return err(new CommandError('User not found', { cause: userResult.error }));
  }

  const permissionResult = this.checkPermission(userResult.value);

  if (permissionResult.isErr()) {
    return err(new CommandError('Permission denied', { cause: permissionResult.error }));
  }

  return ok(undefined);
}
```

---

## 📝 Logger

**Rôle** : Créer des loggers hiérarchiques avec contexte automatique.

```ts
// ./src/core/logger.ts
import winston from "winston";

class LoggerFactory {
  private root: winston.Logger;

  constructor() {
    this.root = winston.createLogger({
      level: env.LOG_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        new winston.transports.File({
          filename: "logs/error.log",
          level: "error",
        }),
        new winston.transports.File({ filename: "logs/combined.log" }),
      ],
    });
  }

  getLogger(label: string, parent?: string): winston.Logger {
    const fullLabel = parent ? `${parent}:${label}` : label;

    return this.root.child({ label: fullLabel });
  }
}

export const loggerFactory = new LoggerFactory();

// Helpers
export const createLogger = (label: string, parent?: string) =>
  loggerFactory.getLogger(label, parent);
```

#### Logger labels

| **Composant**  | **Label**           | **Exemple**                                 |
| -------------- | ------------------- | ------------------------------------------- |
| BotClient      | `global`            | `[global] Bot starting...`                  |
| ServiceManager | `manager:service`   | `[manager:service] Connecting all services` |
| PluginManager  | `manager:plugin`    | `[manager:plugin] Triggering onReady hook`  |
| CommandManager | `manager:command`   | `[manager:command] Routing interaction`     |
| Service        | `service:<name>`    | `[service:database] Connected successfully` |
| Plugin         | `plugin:<name>`     | `[plugin:moderation] Processing ban`        |
| Command        | `command:<name>`    | `[command:ban] Executing with middlewares`  |
| Middleware     | `middleware:<name>` | `[middleware:rate-limit] User rate limited` |
| ErrorHandler   | `error-handler`     | `[error-handler] Unhandled plugin error`    |

---

## 🔧 Configuration

### Variables d'Environnement

**Fichier** : `./src/core/env.ts`
**Validation** : Zod avec parsing strict (fatal error si invalide).

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

  // services (exemples)
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
});

type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
```

### Flags de configuration

**Stockage** : `BotClient.config` (`Record<string, unknown>`)
**Usage** : Flags runtime modifiables sans redémarrage.

```ts
// Initialisation dans ./src/client.ts
const client = new BotClient({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  config: {
    features: {
      automod: true,
      logging: true,
      analytics: false,
    },
    limits: {
      maxWarnings: 3,
      banDuration: 86400, // 24h en secondes
    },
  },
});

// Utilisation dans un plugin
export class ModerationPlugin extends BasePlugin {
  async warn(userId: string): Promise<Result<void, PluginError>> {
    const maxWarnings = this.client.config.limits?.maxWarnings ?? 3;

    // Logic
  }
}
```

**Note** : Pas de typage strict pour `config` car les flags sont dynamiques et peuvent être modifiés runtime.

---

## 🏥 Health Checks

### Structure

```ts
interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  version: string;
  services: Record<string, ServiceHealth>;
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

**Implémentation** :

```ts
// BotClient
async getHealth(): Promise<HealthCheck> {
  const serviceHealth = await this.serviceManager.getHealth();
  const pluginHealth = await this.pluginManager.getHealth();

  const allServicesHealthy = Object.values(serviceHealth)
    .every(s => s.healthy);
  const allPluginsHealthy = Object.values(pluginHealth)
    .every(p => p.healthy);

  let status: 'healthy' | 'degraded' | 'unhealthy';

  if (allServicesHealthy && allPluginsHealthy) {
    status = 'healthy';
  } else if (allServicesHealthy || allPluginsHealthy) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return {
    status,
    uptime: process.uptime(),
    version: '1.0.0', // Depuis package.json
    services: serviceHealth,
    plugins: pluginHealth,
  };
}
```

**Usage** :

```ts
// Dans un plugin de monitoring
const health = await this.client.getHealth();

if (health.status === "unhealthy") {
  this.logger.error("System unhealthy", { health });
}
```

---

## 🚀 Lifecycle

### Point d’entrée

```ts
// ./src/main.ts
import { client } from "./client";
import { env } from "./core/env";
import { createLogger } from "./core/logger";

const logger = createLogger("main");

async function main() {
  logger.info("Starting HIRO bot...", {
    environment: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
  });

  const startResult = await client.start();

  if (startResult.isErr()) {
    logger.error("Failed to start bot", { error: startResult.error });
    process.exit(1);
  }

  logger.info("✅ HIRO bot started successfully");

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    const stopResult = await client.stop();

    if (stopResult.isErr()) {
      logger.error("Error during shutdown", { error: stopResult.error });
      process.exit(1);
    }

    logger.info("👋 HIRO bot stopped");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error("Fatal error in main", { error });
  process.exit(1);
});
```

### Séquence de démarrage

```
1. Chargement de env.ts
   └─> Validation Zod (fatal si échec)

2. Initialisation du BotClient
   ├─> Création des Managers
   ├─> Initialisation du logger global
   └─> Chargement de la config

3. Enregistrement des Services
   └─> ServiceManager.register(service) pour chaque service

4. Enregistrement des Plugins
   └─> PluginManager.register(plugin) pour chaque plugin

5. Enregistrement des Commands
   └─> CommandManager.register(command) pour chaque commande

6. Connexion des Services
   ├─> ServiceManager.connectAll()
   └─> Trigger PluginManager.triggerHook('onServiceConnected', service)

7. Discord Login
   └─> client.login(env.DISCORD_TOKEN)

8. Hooks de Prêt
   ├─> PluginManager.triggerHook('onReady')
   └─> PluginManager.triggerHook('onClientReady')

9. Enregistrement des Slash Commands
   └─> CommandManager.registerCommands()

10. Ready ✅
```

### Séquence d'arrêt

```
1. Signal de shutdown (SIGINT, SIGTERM)
   └─> client.stop()

2. Hooks de Destruction
   ├─> PluginManager.triggerHook('onBeforeDestroy') [reverse order]
   └─> PluginManager.triggerHook('onDestroy') [reverse order]

3. Déconnexion des Services
   └─> ServiceManager.disconnectAll() [reverse order]

4. Discord Logout
   └─> client.destroy()

5. Fermeture des Loggers
   └─> logger.end()

6. Exit Process
   └─> process.exit(0)
```

---

## 📚 Best practices

### 1) Typage strict

```ts
// ✅ Bon : Typer les métadonnées
interface RateLimitMetadata {
  remaining: number;
  resetAt: number;
  current: number;
}

ctx.metadata.set<RateLimitMetadata>("rateLimit", {
  remaining: 5,
  resetAt: Date.now() + 60000,
  current: 1,
});

const rateLimitInfo = ctx.metadata.get<RateLimitMetadata>("rateLimit");

// ❌ Mauvais : Métadonnées non typées
ctx.metadata.set("rateLimit", {
  /* ... */
});
const info = ctx.metadata.get("rateLimit"); // Type unknown
```

### 2) Error handling

```ts
// ✅ Bon : Toujours wrapper les erreurs
const result = await service.connect();

if (result.isErr()) {
  return err(
    new PluginError("Service connection failed", {
      cause: result.error,
      context: { serviceName: service.name },
    })
  );
}

// ❌ Mauvais : Throw directement
const result = await service.connect();
if (result.isErr()) {
  throw result.error; // Bypass le système Result
}
```

### 3) Logging context

```ts
// ✅ Bon : Ajouter du contexte
this.logger.info("User banned", {
  userId: member.id,
  reason,
  moderatorId,
  guildId: member.guild.id,
});

// ❌ Mauvais : Log sans contexte
this.logger.info("User banned");
```

### 4) Dependency injection

```ts
// ✅ Bon : DI via constructor
@injectable()
export class MyCommand extends BaseCommand {
  constructor(
    @inject(MyPlugin) private plugin: MyPlugin,
    @inject(MyService) private service: MyService
  ) {
    super();
  }
}

// ❌ Mauvais : Import direct
import { myPlugin } from "../plugins/my-plugin";
// Crée un couplage fort
```

### 5) Middlewares composables

```ts
// ✅ Bon : Middlewares indépendants et réutilisables
@RequireRole('Admin')
@RateLimit({ max: 5, window: 60 })
@Log()
async execute(ctx: CommandContext) {
  // Logic
}

// ❌ Mauvais : Logique dans la commande
async execute(ctx: CommandContext) {
  // Check role
  if (!hasRole(ctx.interaction.member, 'Admin')) return;

  // Check rate limit
  if (isRateLimited(ctx.interaction.user)) return;

  // Log
  this.logger.info('Executing...');

  // Logic
}
```

### 6) Result chaining

```ts
// ✅ Bon : Composition avec Result
const userResult = await this.getUser(id);
if (userResult.isErr())
  return err(new CommandError("User error", { cause: userResult.error }));

const permResult = await this.checkPermission(userResult.value);
if (permResult.isErr())
  return err(new CommandError("Permission error", { cause: permResult.error }));

return ok(undefined);

// Ou avec .andThen()
return (await this.getUser(id))
  .andThen((user) => this.checkPermission(user))
  .andThen(() => this.executeAction());
```

---

## 🎓 Concepts avancés

### 1) TypedMetadata implementation

```ts
// ./src/core/middleware.ts
export class TypedMetadata {
  private store = new Map<string, unknown>();

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  keys(): IterableIterator<string> {
    return this.store.keys();
  }
}
```

### 2) Middleware pipeline execution

```ts
// Dans BaseCommand._execute()
async _execute(
  interaction: ChatInputCommandInteraction,
  client: BotClient
): Promise<Result<void, CommandError>> {
  const ctx: CommandContext = {
    interaction,
    client,
    metadata: new TypedMetadata(),
  };

  // Récupérer middlewares depuis decorators
  const middlewares = getMiddlewares(this, 'execute');

  // Créer la chaîne d'exécution
  const executeMiddlewares = async (index: number): Promise<Result<void, MiddlewareError>> => {
    if (index >= middlewares.length) {
      // Fin de la chaîne : exécuter la commande
      return this.execute(ctx).mapErr(err => new MiddlewareError('Command execution failed', { cause: err }));
    }

    const middleware = middlewares[index];

    return middleware(ctx, () => executeMiddlewares(index + 1));
  };

  return executeMiddlewares(0);
}
```

### 3) Health Check Aggregation

```ts
// Dans ServiceManager
async getHealth(): Promise<Record<string, ServiceHealth>> {
  const health: Record<string, ServiceHealth> = {};

  for (const service of this.services.values()) {
    const statusResult = service.getStatus();

    health[service.name] = statusResult.isOk()
      ? statusResult.value
      : { connected: false, healthy: false };
  }

  return health;
}

// Dans PluginManager
async getHealth(): Promise<Record<string, PluginHealth>> {
  const health: Record<string, PluginHealth> = {};

  for (const plugin of this.plugins.values()) {
    // Les plugins sont considérés healthy s'ils sont chargés
    health[plugin.name] = {
      loaded: true,
      healthy: true,
      metadata: { /* plugin-specific data */ },
    };
  }

  return health;
}
```

---

## 🚦 Résumé des flux

### Flux d'une commande complète

```
1. User tape /warn @user "spam"
   └─> Discord envoie interaction

2. CommandManager.handleInteraction()
   ├─> Route vers WarnCommand
   └─> Crée CommandContext

3. WarnCommand._execute()
   ├─> Initialise TypedMetadata
   └─> Lance middleware pipeline

4. Middleware: Log
   └─> Log "Command execution started"

5. Middleware: RateLimit
   ├─> Check cache
   ├─> Increment counter
   └─> Set metadata.rateLimit

6. Middleware: RequireRole('Moderator')
   ├─> Check member.roles
   └─> next() si OK

7. WarnCommand.execute()
   ├─> Fetch member
   ├─> Inject ModerationPlugin
   ├─> Call plugin.warn()
   │   ├─> Inject DatabaseService
   │   ├─> Call db.addWarning()
   │   ├─> Get warning count
   │   └─> Auto-ban si > 3
   └─> Reply to interaction

8. Middleware: Log
   └─> Log "Command execution succeeded" + duration

9. PluginManager.triggerHook('onCommandExecuted')
   └─> Notify tous les plugins

10. Response envoyée à l'utilisateur ✅
```
