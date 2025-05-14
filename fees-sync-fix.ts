/**
 * دالة محسنة لحفظ رسوم ياليدين في قاعدة البيانات
 * تستخدم الدالة الجديدة rpc_simple_insert_yalidine_fees لتجنب مشاكل التحويل
 */
async function saveFees(fees: any[], organizationId: string): Promise<void> {
  if (fees.length === 0) {
    console.log('[FEES] لا توجد سجلات أسعار للحفظ');
    return;
  }
  
  console.log(`[FEES] حفظ ${fees.length} سجل أسعار في قاعدة البيانات`);
  
  // تجميع السجلات في دفعات للحفظ
  const batchSize = 200;
  const batches = [];
  
  for (let i = 0; i < fees.length; i += batchSize) {
    batches.push(fees.slice(i, i + batchSize));
  }
  
  console.log(`[FEES] تقسيم إلى ${batches.length} دفعة للحفظ (${batchSize} سجل لكل دفعة)`);
  
  // معالجة 2 دفعات بالتوازي فقط لتقليل الضغط
  const concurrentBatches = 2;
  
  for (let i = 0; i < batches.length; i += concurrentBatches) {
    const currentBatches = batches.slice(i, i + concurrentBatches);
    
    try {
      await Promise.all(currentBatches.map(async (batch) => {
        // استخدام الدالة الجديدة rpc_simple_insert_yalidine_fees
        const batchData = JSON.stringify(batch);
        const { data, error } = await supabase.rpc('rpc_simple_insert_yalidine_fees', {
          p_data: batchData
        });

        if (error) {
          console.error(`[FEES] خطأ في حفظ دفعة (${batch.length} سجل) باستخدام RPC:`, error);
          
          // محاولة استخدام الطريقة البديلة مع شريحة أصغر إذا فشلت الدالة
          if (batch.length > 50) {
            console.log('[FEES] محاولة حفظ دفعة أصغر...');
            const smallerBatches = [];
            for (let j = 0; j < batch.length; j += 50) {
              smallerBatches.push(batch.slice(j, j + 50));
            }
            
            for (const smallBatch of smallerBatches) {
              try {
                const smallBatchData = JSON.stringify(smallBatch);
                const { data: smallData, error: smallError } = await supabase.rpc('rpc_simple_insert_yalidine_fees', {
                  p_data: smallBatchData
                });
                
                if (smallError) {
                  console.error(`[FEES] فشل حفظ الدفعة الصغيرة أيضًا (${smallBatch.length} سجل):`, smallError);
                  
                  // المحاولة النهائية باستخدام upsert المباشر
                  console.log('[FEES] محاولة أخيرة باستخدام upsert المباشر...');
                  const { error: directError } = await supabase
                    .from('yalidine_fees')
                    .upsert(smallBatch, {
                      onConflict: 'organization_id,from_wilaya_id,to_wilaya_id,commune_id',
                      ignoreDuplicates: false
                    });
                    
                  if (directError) {
                    console.error(`[FEES] فشل الحفظ المباشر أيضًا:`, directError);
                  } else {
                    console.log(`[FEES] تم الحفظ المباشر بنجاح لـ ${smallBatch.length} سجل`);
                  }
                } else {
                  console.log(`[FEES] تم حفظ دفعة صغيرة (${smallBatch.length} سجل) بنجاح`);
                }
              } catch (e) {
                console.error(`[FEES] استثناء أثناء محاولة حفظ دفعة صغيرة:`, e);
              }
            }
          } else {
            // محاولة استخدام الطريقة التقليدية مباشرة للدفعات الصغيرة
            try {
              const { error: directError } = await supabase
                .from('yalidine_fees')
                .upsert(batch, {
                  onConflict: 'organization_id,from_wilaya_id,to_wilaya_id,commune_id',
                  ignoreDuplicates: false
                });
                
              if (directError) {
                console.error(`[FEES] فشل الحفظ المباشر أيضًا:`, directError);
              } else {
                console.log(`[FEES] تم الحفظ المباشر بنجاح لـ ${batch.length} سجل`);
              }
            } catch (e) {
              console.error(`[FEES] استثناء أثناء محاولة الحفظ المباشر:`, e);
            }
          }
        } else {
          // الدالة نجحت، عرض عدد السجلات التي تم إدراجها
          console.log(`[FEES] تم حفظ دفعة (${data || batch.length} سجل) بنجاح باستخدام RPC`);
        }
      }));
      
      console.log(`[FEES] تم معالجة ${currentBatches.reduce((sum, batch) => sum + batch.length, 0)} سجل بنجاح`);
    } catch (e) {
      console.error(`[FEES] استثناء أثناء حفظ الأسعار:`, e);
    }
  }
  
  // التحقق من نجاح عملية الحفظ
  try {
    const { count, error } = await supabase
      .from('yalidine_fees')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error(`[FEES] خطأ في التحقق من عدد السجلات:`, error);
    } else {
      console.log(`[FEES] تم التحقق من عدد السجلات في الجدول: ${count}`);
      
      // لفحص المشكلة، افحص أيضًا السجلات في yalidine_fees_new
      try {
        const { count: newCount, error: newError } = await supabase
          .from('yalidine_fees_new')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);
          
        if (!newError) {
          console.log(`[FEES] عدد السجلات في الجدول yalidine_fees_new: ${newCount}`);
          
          if (count === 0 && newCount > 0) {
            console.warn('[FEES] تحذير: البيانات مخزنة في الجدول yalidine_fees_new وليس في yalidine_fees!');
          }
        }
      } catch (e) {
        // تجاهل أي أخطاء هنا
      }
    }
  } catch (e) {
    console.error(`[FEES] استثناء أثناء التحقق من عدد السجلات:`, e);
  }
} 