import type { ChatMessage, ChatTurnResult, McpTool, ToolCaller, ToolTraceEntry } from '../types';

export async function runOpenAiCompatConversation(baseUrl: string, apiKey: string, model: string, systemPrompt: string, messages: ChatMessage[], tools: McpTool[] = [], callTool?: ToolCaller): Promise<ChatTurnResult> {
  if (!baseUrl.trim()) return { reply: 'ยังไม่ได้ตั้งค่า base URL ของ AI gateway กรุณาตั้งค่า OPENAI_COMPAT_BASE_URL', toolTrace: [] };
  if (!apiKey.trim()) return { reply: 'ยังไม่ได้ตั้งค่า API key ของ provider นี้ กรุณาตั้งค่า key ก่อนใช้งาน', toolTrace: [] };
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const openAiMessages: Array<Record<string, unknown>> = [{ role: 'system', content: systemPrompt }, ...messages.map((message) => ({ role: message.role, content: message.content }))];
  const toolTrace: ToolTraceEntry[] = [];
  for (let round = 0; round < 4; round += 1) {
    const body: Record<string, unknown> = { model, messages: openAiMessages };
    if (tools.length) { body.tools = tools.map((tool) => ({ type: 'function', function: { name: `${tool.serverId}__${tool.name}`, description: tool.description, parameters: tool.inputSchema } })); body.tool_choice = 'auto'; }
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body) });
    if (!response.ok) return { reply: `OpenAI-compatible provider ตอบกลับผิดพลาด (${response.status})`, toolTrace };
    const data = await response.json() as { choices?: Array<{ message?: { content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }> };
    const message = data.choices?.[0]?.message;
    if (!message) return { reply: 'provider ไม่ได้ส่งข้อความตอบกลับ', toolTrace };
    if (!message.tool_calls?.length) return { reply: message.content ?? '', toolTrace };
    openAiMessages.push({ role: 'assistant', content: message.content ?? null, tool_calls: message.tool_calls });
    for (const toolCall of message.tool_calls) {
      let args: unknown = {}; try { args = JSON.parse(toolCall.function.arguments); } catch { /* malformed args */ }
      const result = callTool ? await callTool(toolCall.function.name, args) : { error: 'ยังไม่เปิดใช้ MCP tools' };
      toolTrace.push({ toolName: toolCall.function.name, arguments: args, result });
      openAiMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
    }
  }
  return { reply: 'การเรียกเครื่องมือใช้เวลานานเกินกำหนด', toolTrace };
}