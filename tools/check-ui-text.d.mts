// Types for check-ui-text.mjs, read by its tests.
export declare function dashProblem(text: string): string | null;
export declare function textsOfTsx(source: string, fileName?: string): string[];
export declare function breaking(root?: string): string[];
export declare function judge(now: readonly string[], listed: readonly string[], baseList: readonly string[] | null | undefined): string[];
