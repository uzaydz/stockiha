export class AIGateway {
  private static readonly API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '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';
  private static readonly API_URL = 'https://openrouter.ai/api/v1/chat/completions';

  // Primary and fallback models for resilience
  private static readonly MODELS = [
    'x-ai/grok-code-fast-1'
  ];

  private static readonly WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
  private static readonly TTS_API_URL = 'https://api.openai.com/v1/audio/speech';
  private static readonly OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

  static USE_AI = true;

  /**
   * Main chat interface for SIRA 2.0 with Automatic Fallback
   */
  static async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content?: string; tool_calls?: any[]; tool_call_id?: string; name?: string }>,
    tools?: any[],
    signal?: AbortSignal
  ): Promise<any> {
    if (!this.USE_AI || !this.API_KEY) {
      throw new Error('AI Service not configured');
    }

    let lastError: any;

    // Try each model in sequence until one succeeds
    for (let i = 0; i < this.MODELS.length; i++) {
      const model = this.MODELS[i];

      try {
        // Add a small delay before retries to avoid hammering APIs
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const body: any = {
          model: model,
          messages: messages,
          temperature: 0.3,
          max_tokens: 1000,
          stream: false, // Explicitly disable streaming to ensure tool support works on all providers
        };

        if (tools && tools.length > 0) {
          body.tools = tools.map(t => ({
            type: 'function',
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters
            }
          }));
        }

        const resp = await fetch(this.API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.API_KEY}`,
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
            'X-Title': 'Bazaar Console - SIRA 2.0',
            'Content-Type': 'application/json'
          },
          signal,
          body: JSON.stringify(body)
        });

        if (!resp.ok) {
          const errText = await resp.text();

          // If it's a rate limit (429) or server error (5xx) or Not Found (404 - model issue) or Bad Request (400 - often model/provider mismatch), try next model
          if (resp.status === 429 || resp.status >= 500 || resp.status === 404 || resp.status === 400) {
            console.warn(`[AIGateway] ⚠️ Model ${model} failed (${resp.status}). Details: ${errText.slice(0, 200)}...`);
            lastError = new Error(`Model ${model} failed: ${resp.status} - ${errText.slice(0, 100)}`);
            continue; // Try next model
          }

          // For client errors (4xx except 429/404), throw immediately
          console.error('[AIGateway] ❌ Client error:', errText);
          throw new Error(`AI Gateway Error (${model}): ${resp.status}`);
        }

        // Success! Return the response
        const data = await resp.json();

        // Log which model was used (helpful for debugging)
        if (i > 0) {
          console.log(`[AIGateway] ✅ Fallback successful using: ${model}`);
        }

        return data?.choices?.[0]?.message;

      } catch (error: any) {
        // If user aborted, throw immediately
        if (error.name === 'AbortError') {
          throw error;
        }

        console.warn(`[AIGateway] ⚠️ Error with model ${model}:`, error.message);
        lastError = error;

        // If this is the last model, we'll throw below
        if (i === this.MODELS.length - 1) {
          break;
        }

        // Otherwise, continue to next model
      }
    }

    // If we get here, all models failed
    console.error('[AIGateway] ❌ All models failed to respond.');
    throw lastError || new Error('All AI models are currently unavailable. Please try again later.');
  }

  // Legacy method for backward compatibility
  static async summarize(userQuery: string, summary: string, history?: any[], signal?: AbortSignal): Promise<string> {
    const messages = [
      { role: 'system', content: 'You are SIRA, a helpful POS assistant.' },
      ...(history || []),
      { role: 'user', content: `Query: ${userQuery}\nContext: ${summary}` }
    ];
    const response = await this.chat(messages as any, undefined, signal);
    return response?.content || 'Sorry, I could not process that.';
  }

  /**
   * Transcribe audio to text using OpenAI Whisper
   */
  static async transcribeAudio(audioBlob: Blob, language?: string, signal?: AbortSignal): Promise<string> {
    if (!this.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your environment.');
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');

      if (language) {
        formData.append('language', language);
      }

      const resp = await fetch(this.WHISPER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.OPENAI_API_KEY}`,
        },
        body: formData,
        signal,
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Whisper API error: ${resp.status} - ${errorText}`);
      }

      const data = await resp.json();
      return data.text || '';
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      console.error('Whisper transcription error:', error);
      throw new Error(`فشل تحويل الصوت إلى نص: ${error.message}`);
    }
  }

  /**
   * Convert text to speech using OpenAI TTS
   */
  static async textToSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova', signal?: AbortSignal): Promise<Blob> {
    if (!this.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your environment.');
    }

    try {
      const resp = await fetch(this.TTS_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voice,
          response_format: 'mp3',
        }),
        signal,
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`TTS API error: ${resp.status} - ${errorText}`);
      }

      return await resp.blob();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      console.error('TTS error:', error);
      throw new Error(`فشل تحويل النص إلى صوت: ${error.message}`);
    }
  }
}
