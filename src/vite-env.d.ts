/// <reference types="vite/client" />

declare module '@babel/standalone' {
  export interface TransformOptions {
    filename?: string;
    sourceType?: 'script' | 'module' | 'unambiguous';
    presets?: Array<string | [string, Record<string, unknown>]>;
    plugins?: Array<string | [string, Record<string, unknown>]>;
  }

  export interface TransformResult {
    code?: string;
    map?: unknown;
  }

  export function transform(code: string, options?: TransformOptions): TransformResult;
}
