#!/usr/bin/env bun
import './src/server-log-buffer.js';
import { CommandLineParser } from './src/command-line.js';
import { APP_NAME, formatRuntimeLabel } from './src/runtime.js';
import { serverDirectory } from './src/server-directory.js';

process.env.NODE_ENV ??= 'production';
console.log(`${APP_NAME} startup on ${formatRuntimeLabel()}. Environment: ${process.env.NODE_ENV ?? 'development'}. Server directory: ${serverDirectory}`);
process.chdir(serverDirectory);

// config.yaml will be set when parsing command line arguments
const cliArgs = new CommandLineParser().parse(process.argv);
globalThis.DATA_ROOT = cliArgs.dataRoot;
globalThis.COMMAND_LINE_ARGS = cliArgs;

try {
    await import('./src/server-main.js');
} catch (error) {
    console.error('A critical error has occurred while starting the server:', error);
    process.exit(1);
}
