import type { JsonSchema } from './types';

export function toGeminiSchema(schema: JsonSchema): Record<string, unknown> {
  const output: Record<string, unknown> = { ...schema };
  if (schema.type) output.type = schema.type.toUpperCase();
  if (schema.properties) output.properties = Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, toGeminiSchema(value)]));
  if (schema.items) output.items = toGeminiSchema(schema.items);
  return output;
}