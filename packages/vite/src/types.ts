export interface LeptonPluginOptions {
    readonly backendEntry: string;
    readonly env?: Record<string, string>;
    readonly watch?: string[];
    readonly setupModule?: string;
}
