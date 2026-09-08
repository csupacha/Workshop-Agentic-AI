export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type ChatProvider = 'gemini' | 'openai' | 'openai-compat';
export type JsonSchema = { type?: string; description?: string; properties?: Record<string, JsonSchema>; required?: string[]; items?: JsonSchema; [key: string]: unknown };
export type McpTool = { serverId: string; name: string; description?: string; inputSchema: JsonSchema };
export type ToolTraceEntry = { toolName: string; arguments?: unknown; result?: unknown; error?: string };
export type ToolCaller = (name: string, args: unknown) => Promise<unknown>;
export type ChatTurnResult = { reply: string; toolTrace: ToolTraceEntry[] };
export function toolFunctionName(serverId: string, toolName: string): string { return `${serverId}__${toolName}`; }