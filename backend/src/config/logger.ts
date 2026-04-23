import { createLogger, format, transports } from "winston";

const logLevel = process.env.LOG_LEVEL ?? "info";

export const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
      if (stack) {
        return `${timestamp} [${level}] ${message}\n${stack}`;
      }

      return `${timestamp} [${level}] ${message}`;
    }),
  ),
  transports: [new transports.Console()],
});
