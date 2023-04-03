import { Command } from 'commander';
import { config } from 'dotenv';
config();

import * as commands from './Commands';

const program = new Command();

program.addCommand(commands.uploadFileCommand);
program.addCommand(commands.uploadFileMultipartCommand);
program.addCommand(commands.uploadFolderZipCommand);
program.addCommand(commands.downloadFileCommand);
program.addCommand(commands.downloadFileCommandParallel);
program.addCommand(commands.renameFileCommand);
program.addCommand(commands.getFileInfoCommand);
program.addCommand(commands.createBucketCommand);
program.addCommand(commands.deleteBucketCommand);
program.addCommand(commands.getDownloadLinksCommand);
// program.addCommand(commands.downloadFolderZippedCommand);

program.parse(process.argv);
