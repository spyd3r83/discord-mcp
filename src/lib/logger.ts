type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const configured = (process.env["LOG_LEVEL"] ?? "info") as LogLevel;
const minLevel = LEVELS[configured] ?? LEVELS.info;

function log(level: LogLevel, message: string, data?: unknown): void {
  if ((LEVELS[level] ?? 0) < minLevel) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(data !== undefined ? { data } : {}),
  };
  // Always write to stderr — stdout is reserved for the MCP stdio transport channel.
  process.stderr.write(JSON.stringify(entry) + "\n");
}

export const logger = {
  debug: (message: string, data?: unknown) => log("debug", message, data),
  info: (message: string, data?: unknown) => log("info", message, data),
  warn: (message: string, data?: unknown) => log("warn", message, data),
  error: (message: string, data?: unknown) => log("error", message, data),
};
