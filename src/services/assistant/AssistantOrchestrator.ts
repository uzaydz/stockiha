import { IntentEngine } from './IntentEngine';
import { AIGateway } from './AIGateway';
import { AIIntentPlanner } from './AIIntentPlanner';
import { UnifiedMutationService } from './UnifiedMutationService';
import { ExpenseAssistantService } from './UnifiedMutationService';
import { LocalAnalyticsService } from '@/services/LocalAnalyticsService';
import { deltaWriteService } from '@/services/DeltaWriteService';
import type { LocalCustomer } from '@/database/localDb';
import { computeAvailableStock } from '@/lib/stock';
import { ErrorHandler, handleError, getDetailedErrorMessage } from './ErrorHandler';
import { ContextManager } from './ContextManager';
import { UniversalIntelligence } from './UniversalIntelligence';
import { GeniusIntelligence } from './GeniusIntelligence';
import { LearningSystem } from './LearningSystem';
import { FastIntelligence } from './FastIntelligence';
import type { ParsedIntent, AssistantResult } from './types';

function norm(s: string) {
  return s.toLowerCase();
}

async function resolveProductByQuery(query: string) {
  const results = await LocalAnalyticsService.searchProduct(query);
  return results || [];
}

async function resolveCustomerByQuery(query: string, organizationId?: string) {
  const q = (query || '').toString();
  const digits = q.replace(/\D+/g, '');
  // ⚡ Delta Sync - جلب العملاء
  const all = organizationId
    ? await deltaWriteService.getAll<LocalCustomer>('customers', organizationId)
    : [];
  const pool = all;

  if (digits) {
    const phoneMatches = pool.filter(c => ((c.phone || '').replace(/\D+/g, '')).includes(digits));
    if (phoneMatches.length) return phoneMatches;
  }

  const { fuzzySearch } = await import('@/lib/fuzzyMatch');

  const candidates = fuzzySearch(
    q,
    pool,
    (c) => c.name || '',
    {
      threshold: 0.4,
      limit: 10
    }
  );

  return candidates as any[];
}

export const AssistantOrchestrator = {
  parse(query: string): ParsedIntent {
    return IntentEngine.parse(query);
  },

  async process(query: string, opts?: { organizationId?: string; history?: Array<{ role: 'user' | 'assistant'; content: string }>; context?: { lastProduct?: any }; signal?: AbortSignal }): Promise<AssistantResult> {
    try {
      // 0) Check for abort signal
      if (opts?.signal?.aborted) {
        throw new DOMException('Operation aborted', 'AbortError');
      }

      // 1) Handle Pending Selections (Legacy UI interaction logic)
      const now = Date.now();
      (AssistantOrchestrator as any)._pendingSelection = (AssistantOrchestrator as any)._pendingSelection || null;
      let pending = (AssistantOrchestrator as any)._pendingSelection;

      // Clean up expired pending selections
      if (pending && now - pending.createdAt > 5 * 60 * 1000) {
        (AssistantOrchestrator as any)._pendingSelection = null;
        pending = null;
      }

      const qTrim = (query || '').trim();
      const numPick = qTrim.match(/^\s*(?:اختر|رقم|num|number)?\s*(\d{1,2})\s*$/i);

      if (pending && numPick) {
        const idx = parseInt(numPick[1], 10) - 1;
        if (idx < 0 || idx >= pending.candidates.length) {
          return { answer: 'رقم غير صالح. الرجاء إدخال رقم من القائمة.' };
        }
        const chosen = pending.candidates[idx];

        // Execute based on pending type (Legacy logic preserved for stability)
        if (pending.type === 'customer_payment') {
          const amount = Number(pending.payload?.amount || 0);
          const res = await UnifiedMutationService.applyCustomerPayment({
            organizationId: pending.orgId,
            customerId: chosen.id,
            amount
          });
          (AssistantOrchestrator as any)._pendingSelection = null;
          return { answer: `✅ تم تسجيل الدفعة ${amount} دج للعميل ${chosen.name}.`, data: res };
        } else if (pending.type === 'add_customer_debt') {
          const amount = Number(pending.payload?.amount || 0);
          const res = await UnifiedMutationService.createCustomerDebt({
            organizationId: pending.orgId,
            customerId: chosen.id,
            customerName: chosen.name,
            amount
          });
          (AssistantOrchestrator as any)._pendingSelection = null;
          return { answer: `✅ تم تسجيل دين بمبلغ ${amount} دج للعميل ${chosen.name}.`, data: res };
        }
        // Clear pending selection for other cases
        (AssistantOrchestrator as any)._pendingSelection = null;
      }

      // 2) Main AI Logic: Use GeniusIntelligence (SIRA Genius)
      console.log('[AssistantOrchestrator] 🧠 Calling SIRA GeniusIntelligence...');

      // Enrich context with more details if available
      const enrichedContext = {
        ...opts?.context,
        organizationId: opts?.organizationId,
        platform: typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron') ? 'Desktop' : 'Web',
        currentPage: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
      };

      const response = await GeniusIntelligence.think(query, enrichedContext, opts?.history, opts?.signal);
      console.log(`⏱️ [AssistantOrchestrator] GeniusIntelligence.think returned at ${new Date().toISOString()}`);

      // 🚀 Forward the widget from GeniusResponse to the final result
      return {
        answer: response.answer,
        widget: response.widget, // 🆕 WIDGET SUPPORT
        data: {
          confidence: response.confidence,
          suggestions: response.suggestions,
          relatedQuestions: response.relatedQuestions,
          dataUsed: response.dataUsed,
          intent: response.intent
        }
      };

    } catch (error: any) {
      if (error?.name === 'AbortError' || opts?.signal?.aborted) {
        throw error;
      }
      console.error('[AssistantOrchestrator] Error:', error);
      return {
        answer: 'عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
        error: true
      };
    }
  },

  // Legacy method kept for interface compatibility if needed
  async processSingleIntent(intent: any, opts?: any): Promise<AssistantResult> {
    return { answer: 'Legacy method deprecated.' };
  }
};
