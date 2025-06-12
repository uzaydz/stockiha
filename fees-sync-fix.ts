/**
 * دالة محسنة لحفظ رسوم ياليدين في قاعدة البيانات
 * تستخدم الدالة الجديدة rpc_simple_insert_yalidine_fees لتجنب مشاكل التحويل
 */
async function saveFees(fees: any[], organizationId: string): Promise<void> {
  if (fees.length === 0) {
    
    return;
  }

  // تجميع السجلات في دفعات للحفظ
  const batchSize = 200;
  const batches = [];
  
  for (let i = 0; i < fees.length; i += batchSize) {
    batches.push(fees.slice(i, i + batchSize));
  }

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
          
          // محاولة استخدام الطريقة البديلة مع شريحة أصغر إذا فشلت الدالة
          if (batch.length > 50) {
            
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
                  
                  // المحاولة النهائية باستخدام upsert المباشر
                  
                  const { error: directError } = await supabase
                    .from('yalidine_fees')
                    .upsert(smallBatch, {
                      onConflict: 'organization_id,from_wilaya_id,to_wilaya_id,commune_id',
                      ignoreDuplicates: false
                    });
                    
                  if (directError) {
                  } else {
                    
                  }
                } else {
                  
                }
              } catch (e) {
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
              } else {
                
              }
            } catch (e) {
            }
          }
        } else {
          // الدالة نجحت، عرض عدد السجلات التي تم إدراجها
          
        }
      }));

    } catch (e) {
    }
  }
  
  // التحقق من نجاح عملية الحفظ
  try {
    const { count, error } = await supabase
      .from('yalidine_fees')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    
    if (error) {
    } else {

      // لفحص المشكلة، افحص أيضًا السجلات في yalidine_fees_new
      try {
        const { count: newCount, error: newError } = await supabase
          .from('yalidine_fees_new')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);
          
        if (!newError) {

          if (count === 0 && newCount > 0) {
          }
        }
      } catch (e) {
        // تجاهل أي أخطاء هنا
      }
    }
  } catch (e) {
  }
}
