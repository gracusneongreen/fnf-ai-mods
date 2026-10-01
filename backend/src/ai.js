import { getState } from './state.js';

// AI Provider abstraction — supports OpenAI-compatible APIs
// Works with OpenAI, Azure OpenAI, local LLMs (Ollama, LM Studio), etc.

export function getConfig() {
  return getState().aiConfig;
}

export function updateConfig(updates) {
  const config = getState().aiConfig;
  Object.assign(config, updates);
  return config;
}

export function isConfigured() {
  return !!getState().aiConfig.apiKey;
}

// Call the AI API with messages, optional tools, and stream the response
// Returns an async generator that yields events:
//   { type: 'text', content: '...' }
//   { type: 'tool_call', id, name, arguments }
//   { type: 'done' }
export async function* chatCompletion(messages, tools = [], options = {}) {
  const config = getConfig();
  if (!config.apiKey) {
    yield { type: 'error', message: 'AI provider not configured. Please set your API key in Settings.' };
    return;
  }

  const body = {
    model: options.model || config.model,
    messages,
    stream: true,
  };

  if (tools.length > 0) {
    body.tools = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  const url = config.baseUrl.replace(/\/$/, '') + '/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    yield { type: 'error', message: `AI API error (${response.status}): ${errText}` };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const toolCalls = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') {
        // Emit any accumulated tool calls
        for (const tc of Object.values(toolCalls)) {
          if (tc.name) {
            yield {
              type: 'tool_call',
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments || '{}',
            };
          }
        }
        yield { type: 'done' };
        return;
      }
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          yield { type: 'text', content: delta.content };
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index || 0;
            if (!toolCalls[idx]) {
              toolCalls[idx] = { id: tc.id, name: '', arguments: '' };
            }
            if (tc.id) toolCalls[idx].id = tc.id;
            if (tc.function?.name) toolCalls[idx].name += tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments;
          }
        }
      } catch {
        // Skip unparseable chunks
      }
    }
  }

  // Emit any remaining tool calls
  for (const tc of Object.values(toolCalls)) {
    if (tc.name) {
      yield { type: 'tool_call', id: tc.id, name: tc.name, arguments: tc.arguments || '{}' };
    }
  }
  yield { type: 'done' };
}

// Non-streaming completion for internal agent use
export async function chatCompletionSync(messages, tools = []) {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error('AI provider not configured');
  }

  const body = {
    model: config.model,
    messages,
  };

  if (tools.length > 0) {
    body.tools = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }

  const url = config.baseUrl.replace(/\/$/, '') + '/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message;
}
