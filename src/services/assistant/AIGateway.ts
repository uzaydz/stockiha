export class AIGateway {
  private static readonly API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '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';
  private static readonly API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  private static readonly MODEL = 'x-ai/grok-4-fast';
  static USE_AI = true; // تم التفعيل افتراضياً لاستخدام Grok-4-Fast للردود المختصرة

  static async summarize(userQuery: string, summary: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>, signal?: AbortSignal): Promise<string> {
    if (!this.USE_AI || !this.API_KEY) {
      return `📊 ${summary}`;
    }
    try {
      const resp = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.API_KEY}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
          'X-Title': 'Bazaar Console - SIRA',
          'Content-Type': 'application/json'
        },
        signal,
        body: JSON.stringify({
          model: this.MODEL,
          messages: [
            { role: 'system', content: 'Respond briefly and clearly in the user\'s language. If the user writes Arabic (including Darija), reply in Arabic. Keep 2-4 concise lines.' },
            ...(Array.isArray(history) ? history.slice(-4) : []),
            { role: 'user', content: `السؤال: ${userQuery}\nالبيانات:\n${summary}\n\nاكتب إجابة موجزة (سطرين إلى أربعة).` }
          ],
          temperature: 0.5,
          max_tokens: 200
        })
      });
      if (!resp.ok) return `📊 ${summary}`;
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content?.trim?.() || '';
      return content || `📊 ${summary}`;
    } catch {
      return `📊 ${summary}`;
    }
  }
}
