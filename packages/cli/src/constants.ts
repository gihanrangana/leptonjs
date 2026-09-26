import { homedir } from 'node:os';
import { join } from 'node:path';

export const LEPTON_CACHE_DIR = join(homedir(), '.leptonjs', 'cache');

/**
 * Inno Setup constants
 */
export const INNO_MAJOR = 7;
export const INNO_CACHE_ROOT = join(LEPTON_CACHE_DIR, 'inno-setup');
export const INNO_SETUP_URL = 'https://api.github.com/repos/jrsoftware/issrc/releases/latest';
export const INNO_SETUP_RELEASES =
    'https://api.github.com/repos/jrsoftware/issrc/releases?per_page=30';
export const GITHUB_HEADERS = {
    'User-Agent': 'leptonjs-cli',
    Accept: 'application/vnd.github+json',
};
export const REQUIRED_DLLS = ['vcruntime140.dll', 'vcruntime140_1.dll', 'msvcp140.dll'] as const;
export const OPTIONAL_DLLS = [
    'msvcp140_1.dll',
    'msvcp140_2.dll',
    'concrt140.dll',
    'vccorlib140.dll',
] as const;

/**
 * Ink TUI constants
 */
export const MAX_LINES = 500;
export const FLUSH_MS = 50;
export const WIDE_LAYOUT_MIN_COLS = 160;

export const TUI_COLORS = {
    title: '#7dd3fc',
    muted: '#94a3b8',
    border: '#3d4f66',
    backendFg: '#86efac',
    frontendFg: '#fcd34d',
};
