export class AIGateway {
  private static readonly API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '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';
  private static readonly API_URL = 'https://openrouter.ai/api/v1/chat/completions';

  private static readonly MODELS = [
    'google/gemini-2.0-flash-exp', // ⚡ Ultra-fast (Sub-second)
    'x-ai/grok-code-fast-1'
  ];

  // Map to track failed models and their timestamp
  private static _failedModels = new Map<string, number>();

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
    signal?: AbortSignal,
    preferredModel?: string
  ): Promise<any> {
    if (!this.USE_AI || !this.API_KEY) {
      throw new Error('AI Service not configured');
    }

    let lastError: any;

    // Construct the list of models to try
    // If a preferred model is provided, try it first
    let modelsToTry = [...this.MODELS];
    if (preferredModel) {
      // Move preferred model to the front, or add it if not present
      modelsToTry = [preferredModel, ...modelsToTry.filter(m => m !== preferredModel)];
    }

    // Circuit Breaker: Skip models that failed recently (last 5 minutes)
    // We store failed models in a static map: private static failedModels = new Map<string, number>();
    const now = Date.now();
    modelsToTry = modelsToTry.filter(m => {
      const lastFail = (AIGateway as any)._failedModels?.get(m);
      if (lastFail && (now - lastFail) < 5 * 60 * 1000) {
        console.log(`[AIGateway] ⏭️ Skipping ${m} (Circuit Breaker active)`);
        return false;
      }
      return true;
    });

    // If all models are skipped, reset the breaker for the primary model
    if (modelsToTry.length === 0) {
      console.log('[AIGateway] ⚠️ All models in circuit breaker. Resetting primary.');
      modelsToTry = [this.MODELS[0]];
    }

    // Try each model in sequence until one succeeds
    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];

      try {
        // Add a small delay before retries to avoid hammering APIs
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay for speed
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

        console.log(`⏱️ [AIGateway] Sending request to ${model}...`);
        const startFetch = performance.now();
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
        console.log(`⏱️ [AIGateway] Fetch completed in ${(performance.now() - startFetch).toFixed(2)}ms. Status: ${resp.status}`);

        if (!resp.ok) {
          const errText = await resp.text();

          // If it's a rate limit (429) or server error (5xx) or Not Found (404 - model issue) or Bad Request (400 - often model/provider mismatch), try next model
          if (resp.status === 429 || resp.status >= 500 || resp.status === 404 || resp.status === 400) {
            console.warn(`[AIGateway] ⚠️ Model ${model} failed (${resp.status}). Details: ${errText.slice(0, 200)}...`);
            lastError = new Error(`Model ${model} failed: ${resp.status} - ${errText.slice(0, 100)}`);

            // Record failure for circuit breaker
            (AIGateway as any)._failedModels.set(model, Date.now());

            continue; // Try next model
          }

          // For client errors (4xx except 429/404), throw immediately
          console.error('[AIGateway] ❌ Client error:', errText);
          throw new Error(`AI Gateway Error (${model}): ${resp.status}`);
        }

        // Success! Return the response
        const data = await resp.json();

        // Log which model was used (helpful for debugging)
        if (i > 0 || model !== this.MODELS[0]) {
          console.log(`[AIGateway] ✅ Fallback/Preferred successful using: ${model}`);
        }

        const message = data?.choices?.[0]?.message;
        if (message) {
          message._usedModel = model; // Attach used model for stickiness
        }
        return message;

      } catch (error: any) {
        // If user aborted, throw immediately
        if (error.name === 'AbortError') {
          throw error;
        }

        console.warn(`[AIGateway] ⚠️ Error with model ${model}:`, error.message);
        lastError = error;

        // If this is the last model, we'll throw below
        if (i === modelsToTry.length - 1) {
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
