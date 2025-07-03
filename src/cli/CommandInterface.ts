import { Command } from 'commander';
import { EnvironmentConfig } from '../api';
import { Environment } from '..';

export interface CommandOpts {
  version: string;
  command: string;
  name?: string;
  description: string;
  options: Option[];
}

interface Option {
  required?: boolean;
  flags: string;
  description?: string;
  defaultValue?: string | boolean;
}

export function getEnvironment(): Environment {
  const envConfig: EnvironmentConfig = {
    bridgePass: process.env.BRIDGE_PASS as string,
    bridgeUser: process.env.BRIDGE_USER as string,
    encryptionKey: process.env.MNEMONIC,
    bridgeUrl: process.env.BRIDGE_URL,
  };

  return new Environment(envConfig);
}

export function buildCommand(opts: CommandOpts): Command {
  const command = new Command().command(opts.command).version(opts.version).description(opts.description);

  opts.options.forEach((option) => {
    if (option.required) {
      command.requiredOption(option.flags, option.description, option.defaultValue);
    } else {
      command.option(option.flags, option.description, option.defaultValue);
    }
  });

  return command;
}
