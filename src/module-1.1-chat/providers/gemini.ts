import { toGeminiSchema } from '../tool-schema';
import type { ChatMessage, ChatTurnResult, McpTool, ToolCaller, ToolTraceEntry } from '../types';
type GeminiPart = { text?: string; functionCall?: { name: string; args?: unknown }; functionResponse?: unknown };

export async function runGeminiConversation(apiKey: string, model: string, systemPrompt: string, messages: ChatMessage[], tools: McpTool[] = [], callTool?: ToolCaller): Promise<ChatTurnResult> {
  if (!apiKey.trim()) return { reply: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY กรุณาตั้งค่า key ก่อนใช้งาน Gemini', toolTrace: [] };
  const contents: Array<{ role: string; parts: GeminiPart[] }> = messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
  const toolTrace: ToolTraceEntry[] = [];
  for (let round = 0; round < 4; round += 1) {
    const body: Record<string, unknown> = { systemInstruction: { parts: [{ text: systemPrompt }] }, contents };
    if (tools.length) body.tools = [{ functionDeclarations: tools.map((tool) => ({ name: `${tool.serverId}__${tool.name}`, description: tool.description, parameters: toGeminiSchema(tool.inputSchema) })) }];
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) return { reply: `Gemini ตอบกลับผิดพลาด (${response.status})`, toolTrace };
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const calls = parts.filter((part) => part.functionCall);
    if (!calls.length) return { reply: parts.map((part) => part.text ?? '').join('') || 'Gemini ไม่ได้ส่งข้อความตอบกลับ', toolTrace };
    contents.push({ role: 'model', parts });
    for (const part of calls) {
      const call = part.functionCall!;
      const result = callTool ? await callTool(call.name, call.args ?? {}) : { error: 'ยังไม่เปิดใช้ MCP tools' };
      toolTrace.push({ toolName: call.name, arguments: call.args, result });
      contents.push({ role: 'user', parts: [{ functionResponse: { name: call.name, response: { result } } }] });
    }
  }
  return { reply: 'การเรียกเครื่องมือใช้เวลานานเกินกำหนด', toolTrace };
}