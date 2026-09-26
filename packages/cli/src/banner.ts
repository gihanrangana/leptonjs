import { readFileSync } from 'node:fs';
import figlet from 'figlet';
import { cliPackageJsonPath } from './packager/paths';

const TAGLINE = 'Node-powered. Native-rendered.';

export const readVersion = (): string => {
    try {
        const pkg = JSON.parse(readFileSync(cliPackageJsonPath(), 'utf8')) as { version?: string };
        return pkg.version ?? '0.0.0';
    } catch {
        return '0.0.0';
    }
};

const center = (line: string, width: number): string => {
    const pad = Math.max(0, Math.floor((width - line.length) / 2));
    return `${' '.repeat(pad)}${line}`;
};

export const buildBannerLines = (columns = 80): string[] => {
    const width = Math.min(Math.max(columns, 40), 100);
    const art = figlet.textSync('LeptonJS', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
        width,
        whitespaceBreak: true,
    });
    const logoLines = art.split('\n').filter((l) => l.trim().length > 0);
    const version = readVersion();
    return [
        '',
        ...logoLines.map((l) => center(l, columns)),
        center(`${TAGLINE} - v${version}`, columns),
        '',
    ];
};

export const printBanner = (): void => {
    const cols = process.stdout.columns ?? 80;
    for (const line of buildBannerLines(cols)) console.log(line);
};
