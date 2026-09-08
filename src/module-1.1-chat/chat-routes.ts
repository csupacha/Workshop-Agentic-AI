import type { Env } from '../env';
import { errorJson, json } from '../lib/http';
import { runGeminiConversation } from './providers/gemini';
import { runOpenAiCompatConversation } from './providers/openai-compat';
import type { ChatMessage, ChatProvider, ChatTurnResult, McpTool } from './types';

type ChatRequest = { message?: unknown; history?: unknown; provider?: unknown; model?: unknown };
const DEFAULT_MODELS: Record<ChatProvider, string> = { gemini: 'gemini-flash-latest', openai: 'gpt-4o-mini', 'openai-compat': 'gpt-4o-mini' };

export function resolveProvider(value: unknown, env: Env): ChatProvider {
  const candidate = typeof value === 'string' ? value : env.DEFAULT_CHAT_PROVIDER;
  return candidate === 'openai' || candidate === 'openai-compat' ? candidate : 'gemini';
}
export function defaultModelFor(provider: ChatProvider, env: Env): string { return (provider === 'gemini' ? env.GEMINI_MODEL : provider === 'openai' ? env.OPENAI_MODEL : env.OPENAI_COMPAT_MODEL) || DEFAULT_MODELS[provider]; }
export function buildSystemPrompt(): string { return 'คุณเป็นผู้ช่วย AI ภาษาไทยที่สุภาพ กระชับ และช่วยผู้ใช้แก้ปัญหาอย่างเป็นขั้นตอน หากไม่แน่ใจให้บอกตามตรง'; }
function resolveApiKey(provider: ChatProvider, env: Env): string { return provider === 'gemini' ? env.GEMINI_API_KEY || '' : provider === 'openai' ? env.OPENAI_API_KEY || '' : env.OPENAI_COMPAT_API_KEY || ''; }
function resolveBaseUrl(provider: ChatProvider, env: Env): string { return provider === 'openai' ? 'https://api.openai.com/v1' : provider === 'openai-compat' ? env.OPENAI_COMPAT_BASE_URL || '' : ''; }
function resolveTools(): McpTool[] { return []; }

export async function runChatTurn(provider: ChatProvider, model: string, messages: ChatMessage[], env: Env): Promise<ChatTurnResult> {
  const tools = resolveTools();
  if (provider === 'gemini') return runGeminiConversation(resolveApiKey(provider, env), model, buildSystemPrompt(), messages, tools);
  return runOpenAiCompatConversation(resolveBaseUrl(provider, env), resolveApiKey(provider, env), model, buildSystemPrompt(), messages, tools);
}

export async function handleChatRoute(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return errorJson('ต้องใช้เมธอด POST', 405);
  let body: ChatRequest;
  try { body = await request.json() as ChatRequest; } catch { return errorJson('ข้อมูล JSON ไม่ถูกต้อง'); }
  if (typeof body.message !== 'string' || !body.message.trim()) return errorJson('กรุณาระบุ message');
  const provider = resolveProvider(body.provider, env);
  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : defaultModelFor(provider, env);
  const history = Array.isArray(body.history) ? body.history.filter((item): item is ChatMessage => !!item && typeof item === 'object' && ((item as ChatMessage).role === 'user' || (item as ChatMessage).role === 'assistant') && typeof (item as ChatMessage).content === 'string') : [];
  try {
    const result = await runChatTurn(provider, model, [...history, { role: 'user', content: body.message }], env);
    return json({ reply: result.reply, provider, model, toolTrace: result.toolTrace });
  } catch (error) { console.error(error); return json({ reply: 'เกิดข้อผิดพลาดขณะเชื่อมต่อ provider กรุณาตรวจสอบการตั้งค่าแล้วลองใหม่', provider, model, toolTrace: [] }); }
}