import { Command } from 'commander';
import { config } from 'dotenv';
config();

import * as commands from './Commands';

const program = new Command();

program.addCommand(commands.uploadFileCommand);
program.addCommand(commands.uploadFolderZipCommand);
program.addCommand(commands.downloadFileCommand);
program.addCommand(commands.downloadFileCommandParallel);
// program.addCommand(commands.downloadFolderZippedCommand);

program.parse(process.argv);
