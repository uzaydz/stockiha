import { AIGateway } from './AIGateway';
import { SIRA_TOOLS } from './ToolRegistry';

export interface IntelligentResponse {
  answer: string;
  confidence: number;
  dataUsed?: any;
  suggestions?: string[];
  relatedQuestions?: string[];
}

export class UniversalIntelligence {

  private static SYSTEM_PROMPT = `
You are SIRA (Stockiha Intelligence Rapid Artificial), an advanced AI assistant for the Bazaar Console POS system.
Your goal is to help store owners manage their business efficiently.

**Capabilities:**
- You can access real-time sales data, inventory, and customer info using the provided tools.
- You can answer general business questions.
- You speak Arabic (including Darija) and English fluently. Default to the user's language.

**Guidelines:**
- **Be Concise:** Give direct, actionable answers. Avoid fluff.
- **Be Smart:** If a user asks "how are sales?", check today's sales first, but maybe peek at the week's trend if relevant.
- **Be Proactive:** If sales are low, suggest checking low stock items.
- **Format:** Use Markdown for tables and lists.
- **Tone:** Professional, helpful, and encouraging.

**Tools:**
- Use \`get_sales_report\` for revenue/order questions.
- Use \`check_inventory\` for product/stock questions.
- Use \`get_customer_info\` for customer lookups.
- Use \`create_expense\` to record new expenses.
- Use \`update_product_stock\` to adjust inventory levels.

If you cannot find the answer in the tools or your knowledge, admit it gracefully.
`;

  /**
   * Main entry point for SIRA 2.0
   */
  static async answer(
    query: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>,
    signal?: AbortSignal
  ): Promise<IntelligentResponse> {

    // 1. Prepare messages
    const messages: any[] = [
      { role: 'system', content: this.SYSTEM_PROMPT },
      ...(history || []).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: query }
    ];

    try {
      // 2. Initial LLM Call
      // Ensure tools are valid
      const tools = SIRA_TOOLS.filter(t => t.name && t.parameters);
      let response = await AIGateway.chat(messages, tools, signal);

      // 3. Loop for Tool Calls (Max 5 turns to prevent infinite loops)
      let turns = 0;
      while (response?.tool_calls && turns < 5) {
        turns++;

        // Add the assistant's message (with tool calls) to history
        messages.push(response);

        // Execute all tool calls in parallel
        const toolResults = await Promise.all(response.tool_calls.map(async (call: any) => {
          const tool = SIRA_TOOLS.find(t => t.name === call.function.name);
          if (!tool) {
            return {
              role: 'tool',
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify({ error: 'Tool not found' })
            };
          }

          try {
            const args = JSON.parse(call.function.arguments);
            const result = await tool.execute(args);
            return {
              role: 'tool',
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify(result)
            };
          } catch (err: any) {
            return {
              role: 'tool',
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify({ error: err.message })
            };
          }
        }));

        // Add tool results to history
        messages.push(...toolResults);

        // Call LLM again with tool outputs
        response = await AIGateway.chat(messages, tools, signal);
      }

      // 4. Final Response
      return {
        answer: response?.content || 'عذراً، لم أتمكن من معالجة طلبك في الوقت الحالي.',
        confidence: 0.9,
        suggestions: this.generateSuggestions(query)
      };

    } catch (error: any) {
      // إعادة رمي خطأ الإلغاء ليتم التعامل معه في المنسق
      if (error.name === 'AbortError' || signal?.aborted) {
        throw error;
      }

      console.error('SIRA Error:', error);
      return {
        answer: 'واجهت مشكلة تقنية أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.',
        confidence: 0.1
      };
    }
  }

  private static generateSuggestions(query: string): string[] {
    // Simple heuristic for suggestions based on keywords
    const q = query.toLowerCase();
    if (q.includes('sales') || q.includes('مبيعات')) return ['مبيعات الأسبوع', 'أفضل المنتجات'];
    if (q.includes('stock') || q.includes('مخزون')) return ['المنتجات المنتهية', 'جرد المخزون'];
    return ['ما هي مبيعات اليوم؟', 'فحص المخزون'];
  }
}
