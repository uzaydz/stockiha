/**
 * ⚡ PushEngine - Unified Push Engine
 *
 * محرك دفع البيانات من SQLite المحلي إلى Supabase
 *
 * المميزات:
 * - أسماء موحدة 100% مع Supabase (لا TABLE_MAP)
 * - فلترة تلقائية للأعمدة المحلية (تبدأ بـ _)
 * - ترتيب العمليات حسب التبعيات (FK)
 * - Circuit Breaker للحماية من الفشل المتكرر
 * - Parameterized Queries فقط (لا SQL Injection)
 * 
 * ⚠️ TypeScript Note: This file uses dynamic table names which are not in Supabase's generated types.
 * We use @ts-ignore comments where necessary to work around type limitations.
 */

// @ts-nocheck - Dynamic table names and RPC functions not fully typed in Supabase
import { supabase } from '@/lib/supabase-unified';
import { outboxManager } from '../queue/OutboxManager';
import {
    BATCH_CONFIG,
    RETRY_CONFIG,
    CIRCUIT_BREAKER,
    filterLocalColumns,
    getUnifiedTableName,
    isLocalOnlyTable,
    tableNeedsOrgId,
    getTableHook,
} from '../config';
import { databaseCoordinator } from './DatabaseCoordinator';
import type { PushResult } from '@/lib/types';
import type { OutboxEntry } from '../queue/OutboxManager';

/**
 * ⚡ PushEngine Class
 * 
 * ⚠️ CRITICAL FIX: إضافة حماية من الحلقات الجنونية (Self-DDoS)
 * - MIN_INTERVAL_MS: الحد الأدنى بين الدفعات
 * - lastBatchTime: تتبع آخر دفعة
 * - تسجيل تحذير إذا كانت الفترات صغيرة جداً
 */
export class PushEngine {
    private isRunning = false;
    private intervalId: ReturnType<typeof setTimeout> | null = null;
    private organizationId: string | null = null;
    private _sendingLock: Promise<void> | null = null;
    private _sendingLockResolve: (() => void) | null = null;

    // Circuit Breaker State
    private failureCount = 0;
    private lastFailureTime = 0;
    
    // ⚡ CRITICAL FIX: حماية من الحلقات الجنونية
    private lastBatchTime = 0;
    private static readonly MIN_INTERVAL_MS = 1000; // الحد الأدنى 1 ثانية
    private consecutiveQuickCalls = 0; // عداد للاستدعاءات السريعة المتتالية

    /**
     * ⚡ Start the push engine
     */
    start(organizationId: string): void {
        if (this.isRunning) return;

        this.organizationId = organizationId;
        this.isRunning = true;

        console.log(`[PushEngine] 🚀 Started for org ${organizationId}`);
        this.scheduleNextBatch();
    }

    /**
     * ⚡ Stop the push engine
     */
    stop(): void {
        if (this.intervalId) {
            clearTimeout(this.intervalId);
        }
        this.isRunning = false;
        console.log('[PushEngine] ⏹️ Stopped');
    }

    /**
     * ⚡ Schedule next batch processing
     *
     * ⚡ CRITICAL FIX v2: حماية متعددة الطبقات من الحلقات الجنونية (Self-DDoS)
     * 1. التحقق من إيقاف المزامنة
     * 2. فرض حد أدنى للفترة (MIN_INTERVAL_MS)
     * 3. كشف الاستدعاءات السريعة المتتالية
     * 4. التحقق من القيم undefined/NaN
     */
    private scheduleNextBatch(): void {
        if (!this.isRunning) return;

        const now = Date.now();
        const timeSinceLastBatch = now - this.lastBatchTime;

        // ⚡ CRITICAL: كشف الحلقات الجنونية
        if (timeSinceLastBatch < PushEngine.MIN_INTERVAL_MS && this.lastBatchTime > 0) {
            this.consecutiveQuickCalls++;
            
            if (this.consecutiveQuickCalls >= 10) {
                console.error(
                    `[PushEngine] 🚨 CRITICAL: Detected rapid-fire scheduling! ` +
                    `${this.consecutiveQuickCalls} calls in < ${PushEngine.MIN_INTERVAL_MS}ms each. ` +
                    `Forcing 5s cooldown to prevent Self-DDoS.`
                );
                this.intervalId = setTimeout(() => {
                    this.consecutiveQuickCalls = 0;
                    this.scheduleNextBatch();
                }, 5000); // فترة تهدئة 5 ثواني
                return;
            }
        } else {
            this.consecutiveQuickCalls = 0;
        }

        // ⚡ CRITICAL FIX: إذا كانت المزامنة متوقفة، انتظر فترة أقصر للتحقق بسرعة
        // هذا يضمن أن المزامنة تبدأ فوراً بعد انتهاء POS operation
        if (databaseCoordinator.isSyncPaused()) {
            this.intervalId = setTimeout(() => {
                this.scheduleNextBatch();
            }, 500); // ⚡ تقليل من 2000ms إلى 500ms للتحقق بسرعة أكبر
            return;
        }

        outboxManager.getPendingCount().then(count => {
            // ⚡ CRITICAL: التحقق من القيم والتأكد من الحد الأدنى
            let interval = count > 0
                ? BATCH_CONFIG.INTERVAL_MS
                : BATCH_CONFIG.IDLE_INTERVAL_MS;

            // ⚡ حماية من undefined/NaN/0
            if (!interval || isNaN(interval) || interval < PushEngine.MIN_INTERVAL_MS) {
                console.warn(
                    `[PushEngine] ⚠️ Invalid interval detected: ${interval}. ` +
                    `Using safe default: ${PushEngine.MIN_INTERVAL_MS}ms. ` +
                    `Check BATCH_CONFIG values!`
                );
                interval = count > 0 ? 3000 : 30000; // القيم الآمنة الافتراضية
            }

            this.lastBatchTime = Date.now();
            
            this.intervalId = setTimeout(async () => {
                await this.processBatch();
                this.scheduleNextBatch();
            }, interval);
        }).catch(error => {
            // ⚡ في حالة فشل جلب العدد، انتظر فترة آمنة
            console.error('[PushEngine] ❌ Failed to get pending count:', error);
            this.intervalId = setTimeout(() => {
                this.scheduleNextBatch();
            }, 5000); // انتظار 5 ثواني في حالة الخطأ
        });
    }

    /**
     * ⚡ Acquire lock for processing
     */
    private async acquireLock(): Promise<boolean> {
        if (this._sendingLock) return false;
        this._sendingLock = new Promise(resolve => {
            this._sendingLockResolve = resolve;
        });
        return true;
    }

    /**
     * ⚡ Release lock
     */
    private releaseLock(): void {
        if (this._sendingLockResolve) this._sendingLockResolve();
        this._sendingLock = null;
        this._sendingLockResolve = null;
    }

    /**
     * ⚡ Process a batch of pending operations
     */
    async processBatch(): Promise<PushResult> {
        // ⚡ CRITICAL: التحقق من إيقاف المزامنة بواسطة DatabaseCoordinator
        // ملاحظة: لا نسجل رسالة هنا لتجنب تكرار الرسائل - scheduleNextBatch يتعامل مع هذا
        if (databaseCoordinator.isSyncPaused()) {
            return { success: true, processedCount: 0, failedCount: 0, errors: [] };
        }

        if (!await this.acquireLock()) {
            return { success: true, processedCount: 0, failedCount: 0, errors: [] };
        }

        try {
            // ⚡ التحقق مرة أخرى بعد الحصول على القفل (بدون log لتجنب التكرار)
            if (databaseCoordinator.isSyncPaused()) {
                return { success: true, processedCount: 0, failedCount: 0, errors: [] };
            }

            // Check Circuit Breaker
            if (this.isCircuitOpen()) {
                console.warn('[PushEngine] 🔴 Circuit breaker open. Skipping batch.');
                return {
                    success: false,
                    processedCount: 0,
                    failedCount: 0,
                    errors: [{ id: 'circuit', error: 'Circuit breaker open' }]
                };
            }

            // Get pending operations
            const pending = await outboxManager.getPending(BATCH_CONFIG.DEFAULT_SIZE);

            if (pending.length === 0) {
                return { success: true, processedCount: 0, failedCount: 0, errors: [] };
            }

            console.log(`[PushEngine] 📤 ========== بدء معالجة دفعة من العمليات ==========`);
            console.log(`[PushEngine] 📊 إحصائيات الدفعة:`, {
                count: pending.length,
                tables: [...new Set(pending.map(p => p.table_name))],
                operations: [...new Set(pending.map(p => p.operation))]
            });
            console.log(`[PushEngine] 📋 العمليات:`, pending.map(p => ({
                id: p.id.slice(0, 8),
                table: p.table_name,
                operation: p.operation,
                recordId: p.record_id.slice(0, 8),
                seq: p.local_seq
            })));

            // Mark as sending
            await outboxManager.markSending(pending.map(p => p.id));

            // Process operations
            // @ts-ignore - OutboxEntry from OutboxManager has different shape than types/index, but compatible
            const result = await this.sendToServer(pending);

            // Update circuit breaker
            if (result.failedCount > 0) {
                this.failureCount++;
                this.lastFailureTime = Date.now();
            } else {
                this.failureCount = 0;
            }

            return result;

        } catch (error: any) {
            console.error('[PushEngine] ❌ Batch processing error:', error);
            await outboxManager.requeueStuck();
            return {
                success: false,
                processedCount: 0,
                failedCount: 0,
                errors: [{ id: 'batch', error: error.message }]
            };
        } finally {
            this.releaseLock();
        }
    }

    /**
     * ⚡ Check if circuit breaker is open
     */
    private isCircuitOpen(): boolean {
        if (this.failureCount >= CIRCUIT_BREAKER.FAILURE_THRESHOLD) {
            if (Date.now() - this.lastFailureTime < CIRCUIT_BREAKER.RESET_TIMEOUT_MS) {
                return true;
            }
            // Reset after timeout
            this.failureCount = 0;
        }
        return false;
    }

    /**
     * ⚡ Send operations to Supabase
     */
    private async sendToServer(operations: OutboxEntry[]): Promise<PushResult> {
        const result: PushResult = {
            success: true,
            processedCount: 0,
            failedCount: 0,
            errors: []
        };

        const successIds: string[] = [];

        // Sort by dependency
        const sortedOps = this.sortByDependency(operations);

        // ⚡ تجميع العمليات حسب الأولوية (parent tables أولاً)
        const parentOps: OutboxEntry[] = [];
        const childOps: OutboxEntry[] = [];
        const otherOps: OutboxEntry[] = [];

        for (const op of sortedOps) {
            if (op.table_name === 'orders' || op.table_name === 'invoices' || op.table_name === 'returns') {
                parentOps.push(op);
            } else if (op.table_name === 'order_items' || op.table_name === 'invoice_items' || op.table_name === 'return_items') {
                childOps.push(op);
            } else {
                otherOps.push(op);
            }
        }

        // ⚡ إرسال parent tables أولاً
        const parentResult = await this.processOperationsBatch(parentOps);
        result.processedCount += parentResult.processedCount;
        result.failedCount += parentResult.failedCount;
        result.errors.push(...parentResult.errors);
        successIds.push(...parentResult.successIds);

        // ⚡ انتظار قصير للسماح لـ Supabase بالتأكيد (eventual consistency)
        if (parentResult.successIds.length > 0 && childOps.length > 0) {
            await new Promise(r => setTimeout(r, 800));
        }

        // ⚡ إرسال child tables بعد نجاح parent tables
        // نحتاج للتحقق من أن جميع parent records المرتبطة موجودة في السيرفر
        const successfulParentIds = new Set<string>();
        for (const op of parentOps) {
            if (parentResult.successIds.includes(op.id)) {
                successfulParentIds.add(op.record_id);
            }
        }

        // تصفية child operations - نرسل فقط تلك المرتبطة بـ parent records موجودة في السيرفر
        const validChildOps: OutboxEntry[] = [];
        const deferredChildOps: OutboxEntry[] = [];

        // ⚡ جمع parent IDs التي نحتاج للتحقق منها في السيرفر
        const parentIdsToCheck = new Map<string, { op: OutboxEntry; parentId: string; tableName: string }[]>();

        for (const op of childOps) {
            const payload = JSON.parse(op.payload);
            const parentId = payload.order_id || payload.invoice_id || payload.return_id || payload.loss_id || payload.supplier_purchase_id;

            if (parentId && successfulParentIds.has(parentId)) {
                // ⚡ Parent نجح في هذه الدفعة - أرسل child مباشرة (بعد الانتظار أعلاه)
                validChildOps.push(op);
            } else if (parentId) {
                // Parent ليس في هذه الدفعة - نحتاج للتحقق من السيرفر
                const parentTable = payload.order_id ? 'orders' :
                                   payload.invoice_id ? 'invoices' :
                                   payload.return_id ? 'returns' :
                                   payload.loss_id ? 'losses' : 'supplier_purchases';

                if (!parentIdsToCheck.has(parentTable)) {
                    parentIdsToCheck.set(parentTable, []);
                }
                parentIdsToCheck.get(parentTable)!.push({ op, parentId, tableName: parentTable });
            } else {
                // لا يوجد parent ID (حالة غير طبيعية)
                validChildOps.push(op);
            }
        }

        // ⚡ التحقق من وجود parent IDs في السيرفر بدفعة واحدة (فقط للـ parents القديمة)
        for (const [parentTable, entries] of parentIdsToCheck.entries()) {
            const idsToCheck = [...new Set(entries.map(e => e.parentId))];

            try {
                // ⚡ Type assertion: Supabase types require literal table names, but we use dynamic strings
                // @ts-ignore - Dynamic table name not in Supabase types
                const { data: existingParents, error } = await supabase
                    .from(parentTable)
                    .select('id')
                    .in('id', idsToCheck);

                if (error) {
                    console.warn(`[PushEngine] ⚠️ Failed to check ${parentTable} existence:`, error.message);
                    // ⚡ في حالة الخطأ، نحاول إرسالها على أي حال (قد تنجح)
                    for (const entry of entries) {
                        validChildOps.push(entry.op);
                    }
                    continue;
                }

                const existingIds = new Set((existingParents || []).map((p: any) => p.id));

                for (const entry of entries) {
                    if (existingIds.has(entry.parentId)) {
                        validChildOps.push(entry.op);
                    } else {
                        deferredChildOps.push(entry.op);
                    }
                }
            } catch (err) {
                console.warn(`[PushEngine] ⚠️ Exception checking ${parentTable}:`, err);
                // ⚡ في حالة الخطأ، نحاول إرسالها على أي حال
                for (const entry of entries) {
                    validChildOps.push(entry.op);
                }
            }
        }

        if (deferredChildOps.length > 0) {
            console.log(`[PushEngine] ⏳ Deferring ${deferredChildOps.length} child operations (parent not synced yet)`);
            for (const op of deferredChildOps) {
                // ⚡ إعادة الـ status إلى pending بدلاً من failed للمحاولة في الدفعة التالية
                await outboxManager.markFailed(op.id, 'Parent record not synced yet, will retry');
            }
            result.failedCount += deferredChildOps.length;
        }

        if (validChildOps.length > 0) {
            const childResult = await this.processOperationsBatch(validChildOps);
            result.processedCount += childResult.processedCount;
            result.failedCount += childResult.failedCount;
            result.errors.push(...childResult.errors);
            successIds.push(...childResult.successIds);
        }

        // ⚡ إرسال باقي العمليات
        const otherResult = await this.processOperationsBatch(otherOps);
        result.processedCount += otherResult.processedCount;
        result.failedCount += otherResult.failedCount;
        result.errors.push(...otherResult.errors);
        successIds.push(...otherResult.successIds);

        // Mark successful operations
        if (successIds.length > 0) {
            await outboxManager.markSent(successIds);
        }

        return result;
    }

    /**
     * ⚡ Process a batch of operations
     */
    private async processOperationsBatch(operations: OutboxEntry[]): Promise<{
        processedCount: number;
        failedCount: number;
        errors: Array<{ id: string; error: string }>;
        successIds: string[];
    }> {
        const result = {
            processedCount: 0,
            failedCount: 0,
            errors: [] as Array<{ id: string; error: string }>,
            successIds: [] as string[]
        };

        for (const op of operations) {
            try {
                // Skip local-only tables
                if (isLocalOnlyTable(op.table_name)) {
                    result.successIds.push(op.id);
                    result.processedCount++;
                    continue;
                }

                const serverTable = getUnifiedTableName(op.table_name);
                const payload = JSON.parse(op.payload);
                
                // ⚡ CRITICAL FIX: إضافة id إلى payload إذا لم يكن موجوداً (مهم لعمليات UPDATE الجزئية)
                if (!payload.id && op.record_id && op.record_id !== 'unknown') {
                    payload.id = op.record_id;
                }

                let error = null;

                switch (op.operation) {
                    case 'INSERT':
                    case 'UPDATE':
                        error = await this.handleUpsert(serverTable, payload, op.record_id);
                        break;

                    case 'DELETE':
                        error = await this.handleDelete(serverTable, op.record_id);
                        break;

                    case 'DELTA':
                        error = await this.handleDelta(serverTable, op.record_id, payload);
                        break;
                }

                if (error) {
                    // ⚡ إذا كان الخطأ من نوع SKIP_PERMANENTLY، نحذف العملية نهائياً
                    if (error.code === 'UNFIXABLE_PAYLOAD') {
                        console.warn(`[PushEngine] 🗑️ Removing unfixable: ${op.table_name}:${op.record_id}`);
                        await outboxManager.remove(op.id);
                        result.processedCount++; // Count as processed (removed)
                    } else {
                        console.error(`[PushEngine] ❌ Failed: ${op.table_name}:${op.record_id}`, error);
                        // ⚡ Phase 4: تمرير statusCode للتصنيف الدقيق للأخطاء
                        const statusCode = error.code || error.status || error.statusCode || undefined;
                        await outboxManager.markFailed(op.id, error.message || String(error), statusCode);
                        result.failedCount++;
                        result.errors.push({ id: op.id, error: error.message || String(error) });
                    }
                } else {
                    result.successIds.push(op.id);
                    result.processedCount++;
                }

            } catch (err: any) {
                console.error(`[PushEngine] ❌ Exception: ${op.id}`, err);
                // ⚡ Phase 4: تمرير statusCode للتصنيف الدقيق للأخطاء
                const statusCode = err.code || err.status || err.statusCode || undefined;
                await outboxManager.markFailed(op.id, err.message || String(err), statusCode);
                result.failedCount++;
                result.errors.push({ id: op.id, error: err.message || String(err) });
            }
        }

        return result;
    }

    /**
     * ⚡ CRITICAL FIX: Handle INSERT/UPDATE operation with Hooks support
     */
    private async handleUpsert(
        tableName: string,
        payload: Record<string, any>,
        recordIdFromOutbox?: string
    ): Promise<any> {
        const upsertStartTime = Date.now();
        const recordId = payload.id || recordIdFromOutbox || 'unknown';
        
        // ⚡ CRITICAL FIX: إضافة id إلى payload إذا لم يكن موجوداً
        if (!payload.id && recordIdFromOutbox && recordIdFromOutbox !== 'unknown') {
            payload.id = recordIdFromOutbox;
        }
        console.log('[PushEngine] 🚀 ========== بدء handleUpsert ==========');
        console.log('[PushEngine] 📦 بيانات العملية:', {
            tableName,
            recordId: recordId.slice(0, 8),
            payloadKeys: Object.keys(payload).length,
            orgId: this.organizationId?.slice(0, 8) || 'missing'
        });

        // Filter local columns (starting with _) and validate against Supabase schema
        let cleanPayload = filterLocalColumns(payload, tableName);
        console.log('[PushEngine] 🧹 بعد فلترة الأعمدة المحلية:', {
            originalKeys: Object.keys(payload).length,
            cleanedKeys: Object.keys(cleanPayload).length
        });

        // ⚡ Phase 4: استخدام beforeSend Hook إذا كان موجوداً (بعد validateAndFix)
        // Note: hook variable is defined later in validateAndFix section

        // Add organization_id if needed
        if (this.organizationId && !cleanPayload.organization_id && tableNeedsOrgId(tableName)) {
            cleanPayload.organization_id = this.organizationId;
            console.log('[PushEngine] ➕ تم إضافة organization_id');
        }

        // ⚡ Phase 4: استخدام validateAndFix Hook قبل التحقق النهائي
        const hook = getTableHook(tableName);
        if (hook?.validateAndFix) {
            console.log('[PushEngine] 🔧 تطبيق validateAndFix hook...');
            const hookStart = Date.now();
            const validationResult = hook.validateAndFix(tableName, cleanPayload);
            
            if (typeof validationResult === 'boolean') {
                if (!validationResult) {
                    console.warn('[PushEngine] ⚠️ Hook returned false - skipping operation');
                    return { message: 'SKIP_PERMANENTLY', code: 'UNFIXABLE_PAYLOAD' };
                }
            } else if (validationResult && !validationResult.valid) {
                console.warn('[PushEngine] ⚠️ Hook validation failed - skipping operation');
                return { message: 'SKIP_PERMANENTLY', code: 'UNFIXABLE_PAYLOAD' };
            } else if (validationResult && validationResult.fixedPayload) {
                cleanPayload = validationResult.fixedPayload;
            }
            
            console.log('[PushEngine] ✅ تم تطبيق validateAndFix hook:', {
                duration: (Date.now() - hookStart) + 'ms',
                valid: typeof validationResult === 'boolean' ? validationResult : validationResult?.valid
            });
        }

        // Validate and fix required fields - skip if unfixable
        const isValid = this.validatePayload(tableName, cleanPayload);
        if (!isValid) {
            console.error('[PushEngine] ❌ فشل التحقق من البيانات - سيتم تخطي العملية');
            // Return a special error that marks this as permanently failed (should be removed)
            return { message: 'SKIP_PERMANENTLY', code: 'UNFIXABLE_PAYLOAD' };
        }
        console.log('[PushEngine] ✅ تم التحقق من البيانات بنجاح');

        const supabaseStart = Date.now();
        // ⚡ Type assertion: Supabase types require literal table names, but we use dynamic strings
        // @ts-ignore - Dynamic table name not in Supabase types
        const { error } = await supabase
            .from(tableName)
            .upsert(cleanPayload);
        const supabaseDuration = Date.now() - supabaseStart;

        if (error) {
            console.error('[PushEngine] ❌ ========== فشل handleUpsert ==========');
            console.error('[PushEngine] ❌ تفاصيل الخطأ:', {
                tableName,
                recordId: recordId.slice(0, 8),
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                supabaseDuration: supabaseDuration + 'ms'
            });
        } else {
            console.log('[PushEngine] ✅ ========== نجح handleUpsert ==========');
            console.log('[PushEngine] 📊 ملخص:', {
                tableName,
                recordId: recordId.slice(0, 8),
                supabaseDuration: supabaseDuration + 'ms',
                totalDuration: (Date.now() - upsertStartTime) + 'ms'
            });
        }

        // ⚡ Phase 4: استخدام afterSuccess/afterFailure Hooks
        const hookForCallbacks = getTableHook(tableName);
        if (!error && hookForCallbacks?.afterSuccess) {
            try {
                console.log('[PushEngine] 🔧 تطبيق afterSuccess hook...');
                await hookForCallbacks.afterSuccess(tableName, cleanPayload.id || payload.id, cleanPayload);
                console.log('[PushEngine] ✅ تم تطبيق afterSuccess hook');
            } catch (hookError) {
                console.warn(`[PushEngine] ⚠️ afterSuccess hook error for ${tableName}:`, hookError);
            }
        } else if (error && hookForCallbacks?.afterFailure) {
            try {
                console.log('[PushEngine] 🔧 تطبيق afterFailure hook...');
                await hookForCallbacks.afterFailure(tableName, cleanPayload.id || payload.id, error, cleanPayload);
                console.log('[PushEngine] ✅ تم تطبيق afterFailure hook');
            } catch (hookError) {
                console.warn(`[PushEngine] ⚠️ afterFailure hook error for ${tableName}:`, hookError);
            }
        }

        return error;
    }

    /**
     * ⚡ Handle DELETE operation
     */
    private async handleDelete(tableName: string, recordId: string): Promise<any> {
        // ⚡ Type assertion: Supabase types require literal table names, but we use dynamic strings
        // @ts-ignore - Dynamic table name not in Supabase types
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', recordId);

        return error;
    }

    /**
     * ⚡ Handle DELTA operation (atomic update)
     */
    private async handleDelta(
        tableName: string,
        recordId: string,
        deltaPayload: Record<string, number>
    ): Promise<any> {
        // Try atomic RPC first
        // ⚡ Type assertion: apply_delta_atomic may not be in generated types
        // @ts-ignore - apply_delta_atomic RPC may not be in generated Supabase types
        const { data, error: rpcError } = await supabase.rpc('apply_delta_atomic', {
            p_table_name: tableName,
            p_record_id: recordId,
            p_delta: deltaPayload
        });

        if (!rpcError) {
            if (data?.[0]?.success === false) {
                return { message: data[0].error };
            }
            return null;
        }

        // Fallback if RPC not available
        if (rpcError.code === '42883') {
            console.warn('[PushEngine] ⚠️ apply_delta_atomic not found, using fallback');
            return await this.handleDeltaFallback(tableName, recordId, deltaPayload);
        }

        return rpcError;
    }

    /**
     * ⚡ Fallback DELTA with optimistic locking
     */
    private async handleDeltaFallback(
        tableName: string,
        recordId: string,
        deltaPayload: Record<string, number>
    ): Promise<any> {
        const MAX_RETRIES = RETRY_CONFIG.MAX_ATTEMPTS;

        for (let retry = 0; retry < MAX_RETRIES; retry++) {
            // Fetch current values
            const fields = [...Object.keys(deltaPayload), 'updated_at'];
            // ⚡ Type assertion: Supabase types require literal table names, but we use dynamic strings
            // @ts-ignore - Dynamic table name not in Supabase types
            const { data, error: fetchError } = await supabase
                .from(tableName)
                .select(fields.join(','))
                .eq('id', recordId)
                .single();

            if (fetchError) return fetchError;
            if (!data || typeof data !== 'object') return null; // Record deleted or invalid response

            // ⚡ Type guard: ensure data has updated_at property
            // @ts-ignore - data type from Supabase may not include updated_at in types
            const originalUpdatedAt = data.updated_at;
            if (!originalUpdatedAt) {
                console.warn('[PushEngine] ⚠️ Record missing updated_at, skipping optimistic lock');
                return { message: 'Record missing updated_at field' };
            }

            // Calculate new values
            const updates: Record<string, number> = {};
            for (const [field, delta] of Object.entries(deltaPayload)) {
                const current = (data as any)[field] || 0;
                updates[field] = Math.max(0, current + delta);
            }

            // Update with optimistic lock
            // ⚡ Type assertion: Supabase types require literal table names, but we use dynamic strings
            // @ts-ignore - Dynamic table name not in Supabase types
            const { data: updateResult, error: updateError } = await supabase
                .from(tableName)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', recordId)
                .eq('updated_at', originalUpdatedAt)
                .select('id');

            if (updateError) return updateError;

            // Check if update succeeded
            if (updateResult && updateResult.length > 0) {
                return null; // Success
            }

            // Retry with backoff
            if (retry < MAX_RETRIES - 1) {
                await new Promise(r => setTimeout(r, RETRY_CONFIG.BASE_DELAY_MS * (retry + 1)));
            }
        }

        return { message: 'Optimistic lock failed after max retries' };
    }

    /**
     * ⚡ CRITICAL FIX: Validate and fix payload using Table Hooks
     * Returns true if payload is valid/fixable, false if should be skipped
     * 
     * الآن يستخدم نظام Hooks بدلاً من منطق orders المدمج
     */
    private validatePayload(tableName: string, payload: Record<string, any>): boolean {
        // ⚡ استخدام Table Hook إذا كان موجوداً
        const hook = getTableHook(tableName);
        
        if (hook?.validateAndFix) {
            const result = hook.validateAndFix(tableName, payload);
            
            if (typeof result === 'boolean') {
                return result;
            }
            
            if (result && typeof result === 'object') {
                if (result.fixedPayload) {
                    // استبدال payload بالإصدار المُصلح
                    Object.assign(payload, result.fixedPayload);
                }
                return result.valid;
            }
        }

        // ⚡ Fallback: إذا لم يكن هناك Hook، نعتبر payload صالحاً
        // (يمكن إضافة منطق افتراضي هنا إذا لزم الأمر)
        return true;
    }

    /**
     * ⚡ Sort operations by dependency (FK order)
     * ✅ محدّث: أسماء الجداول موحدة مع Supabase
     */
    private sortByDependency(operations: OutboxEntry[]): OutboxEntry[] {
        const getPriority = (op: OutboxEntry): number => {
            const table = op.table_name;

            // DELTA operations last
            if (op.operation === 'DELTA') return 100;

            // Parent tables first
            if (table === 'orders') return 1;  // ✅ كان pos_orders
            if (table === 'invoices') return 2;
            if (table === 'returns') return 3;  // ✅ كان product_returns
            if (table === 'losses') return 4;  // ✅ كان loss_declarations
            if (table === 'supplier_purchases') return 5;

            // Child tables second
            if (table === 'order_items') return 10;  // ✅ كان pos_order_items
            if (table === 'invoice_items') return 11;
            if (table === 'return_items') return 12;
            if (table === 'loss_items') return 13;
            if (table === 'supplier_purchase_items') return 14;

            // Everything else
            return 50;
        };

        return [...operations].sort((a, b) => {
            const priorityDiff = getPriority(a) - getPriority(b);
            if (priorityDiff !== 0) return priorityDiff;
            return a.local_seq - b.local_seq;
        });
    }

    /**
     * ⚡ Notify UI of optimistic update
     */
    notifyOptimisticUpdate(table: string, recordId: string, operation: string): void {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('optimistic-update', {
                detail: { table, recordId, operation, timestamp: new Date().toISOString() }
            }));
        }
    }
}
