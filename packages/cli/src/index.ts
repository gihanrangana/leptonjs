import { readVersion } from './banner';
import { runBuild } from './commands/build';
import { runDev } from './commands/dev';
import { runPack } from './commands/pack';
import { runStart } from './commands/start';
import type { PackFlags } from './packager/types';
import { createSession } from './tui/session';

const usage = (): void => {
    console.error(`Usage:
        leptonjs dev [target] [--no-tui]
        leptonjs build [target] [--no-tui]
        leptonjs start [target] [--no-tui]
        leptonjs pack [target] [flags]     (alias: release)

        pack flags:
          --node-version <ver>
          --no-bytecode
          --no-node-runtime
          --skip-integrity
          --no-installer
          --bundle-runtime`);
};

const flagValue = (args: string[], flag: string): string | undefined => {
    const i = args.indexOf(flag);
    if (i === -1) return undefined;
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) return undefined;
    return value;
};

const positionalArgs = (args: string[]): string[] => {
    const skip = new Set<number>();
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--node-version') skip.add(i + 1);
    }
    return args.filter((a, i) => !a.startsWith('--') && !skip.has(i));
};

const packFlags = (rawArgs: string[]): PackFlags => ({
    nodeVersion: flagValue(rawArgs, '--node-version'),
    noBytecode: rawArgs.includes('--no-bytecode'),
    noNodeRuntime: rawArgs.includes('--no-node-runtime'),
    skipIntegrity: rawArgs.includes('--skip-integrity'),
    noInstaller: rawArgs.includes('--no-installer'),
    bundleRuntime: rawArgs.includes('--bundle-runtime'),
});

const runPackCommand = async (
    target: string | undefined,
    rawArgs: string[],
    noTui: boolean,
): Promise<void> => {
    const session = await createSession({
        mode: 'pack',
        headerText: `LeptonJS v${readVersion()}  pack`,
        noTui,
        onQuit: () => process.exit(0),
    });
    try {
        await runPack(session.reporter, target, packFlags(rawArgs));
    } finally {
        session.destroy();
    }
};

const main = async (): Promise<void> => {
    const rawArgs = process.argv.slice(2);
    const noTui = rawArgs.includes('--no-tui');
    const [cmd, target] = positionalArgs(rawArgs);

    switch (cmd) {
        case 'dev':
            await runDev(target, noTui);
            break;
        case 'build':
            await runBuild(target, noTui);
            break;
        case 'start':
            await runStart(target, noTui);
            break;
        case 'pack':
        case 'release':
            await runPackCommand(target, rawArgs, noTui);
            break;
        default:
            usage();
            process.exit(1);
    }
};

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
