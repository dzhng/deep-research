declare module '@ai-sdk/gemiini' {
  interface GemiiniClientOptions {
    apiKey: string;
  }

  export function createGemiini(options: GemiiniClientOptions): (model: string, config: { structuredOutputs?: boolean; reasoningEffort?: string; }) => any;
} 