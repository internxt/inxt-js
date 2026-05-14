import * as Winston from 'winston';

const loggerOptions = {
  levels: {
    warn: 0,
    debug: 1,
    error: 2,
    info: 3,
  },
};

function parseLogLevel(level: number): string {
  const levelNames = Object.keys(loggerOptions.levels);
  const valueIndex = Object.values(loggerOptions.levels).indexOf(level);

  if (valueIndex === -1) {
    return levelNames[levelNames.length - 1];
  }

  return levelNames[valueIndex];
}

const getLoggerInstance = (
  level: number,
  debug?: { enabled: boolean; debugCallback: (msg: string) => void },
): Winston.Logger => {
  const levelName = parseLogLevel(level);
  const _logger = Winston.createLogger({
    level: levelName,
    exitOnError: true,
    handleExceptions: true,
    format: Winston.format.combine(
      Winston.format.colorize({ all: true }),
      Winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      Winston.format.splat(),
      Winston.format.printf((info: Winston.Logform.TransformableInfo) => {
        if (debug && debug.enabled) {
          debug.debugCallback(info.message as string);
        }

        return `${info.timestamp} ${info.level}: ${info.message}`;
      }),
    ),
    transports: [new Winston.transports.Console()],
  });

  if (process?.env?.STAGE !== 'development') {
    _logger.silent = true;
  }

  return _logger;
};

export const logger: Winston.Logger = getLoggerInstance(1);
