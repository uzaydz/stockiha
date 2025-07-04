import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables are not set');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  try {
    // السماح بـ CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // إحصائيات عامة لسجلات المخزون
    const { data: totalStats, error: totalError } = await supabase
      .from('inventory_log')
      .select('id, created_at, operation_type, quantity, value')
      .eq('organization_id', organizationId);

    if (totalError) {
      return res.status(500).json({ error: 'Failed to fetch total statistics' });
    }

    // حساب الإحصائيات
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const stats = {
      total_records: totalStats.length,
      records_last_30_days: totalStats.filter(record => 
        new Date(record.created_at) >= thirtyDaysAgo
      ).length,
      records_last_60_days: totalStats.filter(record => 
        new Date(record.created_at) >= sixtyDaysAgo
      ).length,
      records_last_90_days: totalStats.filter(record => 
        new Date(record.created_at) >= ninetyDaysAgo
      ).length,
      records_older_than_year: totalStats.filter(record => 
        new Date(record.created_at) < oneYearAgo
      ).length,
      
      // تصنيف السجلات حسب الأهمية
      critical_records: totalStats.filter(record => {
        const criticalTypes = ['purchase', 'return', 'theft', 'loss', 'damage'];
        return criticalTypes.includes(record.operation_type) || 
               Math.abs(record.quantity) >= 100 || 
               Math.abs(record.value || 0) >= 1000;
      }).length,
      
      important_records: totalStats.filter(record => {
        const importantTypes = ['sale', 'minor_adjustment', 'transfer'];
        return importantTypes.includes(record.operation_type) || 
               Math.abs(record.quantity) >= 25 || 
               Math.abs(record.value || 0) >= 100;
      }).length,
      
      // إحصائيات حسب نوع العملية
      operation_breakdown: totalStats.reduce((acc, record) => {
        acc[record.operation_type] = (acc[record.operation_type] || 0) + 1;
        return acc;
      }, {}),
      
      // السجلات المعرضة للحذف (حسب السياسات المختلفة)
      records_eligible_for_deletion: {
        normal_180_days: totalStats.filter(record => {
          const recordDate = new Date(record.created_at);
          const cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          const isNormal = !['purchase', 'return', 'theft', 'loss', 'damage', 'sale', 'minor_adjustment', 'transfer'].includes(record.operation_type) &&
                          Math.abs(record.quantity) < 25 &&
                          Math.abs(record.value || 0) < 100;
          return recordDate < cutoffDate && isNormal;
        }).length,
        
        important_365_days: totalStats.filter(record => {
          const recordDate = new Date(record.created_at);
          const cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          const importantTypes = ['sale', 'minor_adjustment', 'transfer'];
          const isImportant = importantTypes.includes(record.operation_type) ||
                             (Math.abs(record.quantity) >= 25 && Math.abs(record.quantity) < 100) ||
                             (Math.abs(record.value || 0) >= 100 && Math.abs(record.value || 0) < 1000);
          return recordDate < cutoffDate && isImportant;
        }).length,
        
        critical_1095_days: totalStats.filter(record => {
          const recordDate = new Date(record.created_at);
          const cutoffDate = new Date(now.getTime() - 1095 * 24 * 60 * 60 * 1000);
          const criticalTypes = ['purchase', 'return', 'theft', 'loss', 'damage'];
          const isCritical = criticalTypes.includes(record.operation_type) ||
                            Math.abs(record.quantity) >= 100 ||
                            Math.abs(record.value || 0) >= 1000;
          return recordDate < cutoffDate && isCritical;
        }).length
      },
      
      // إحصائيات الاستخدام
      disk_usage_estimate: {
        total_size_mb: Math.round(totalStats.length * 0.5), // تقدير تقريبي
        archive_potential_mb: Math.round(totalStats.filter(record => {
          const recordDate = new Date(record.created_at);
          const cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          return recordDate < cutoffDate;
        }).length * 0.5)
      }
    };

    // التحقق من وجود سياسات احتفاظ مخصصة
    const { data: retentionPolicies, error: policiesError } = await supabase
      .from('inventory_retention_policies_v2')
      .select('*')
      .eq('organization_id', organizationId);

    if (policiesError) {
    }

    const response = {
      success: true,
      data: {
        ...stats,
        retention_policies: retentionPolicies || [],
        last_updated: now.toISOString(),
        organization_id: organizationId
      }
    };

    return res.status(200).json(response);

  } catch (globalError) {
    return res.status(500).json({ 
      error: 'Internal server error',
      message: globalError.message,
      stack: process.env.NODE_ENV === 'development' ? globalError.stack : undefined
    });
  }
}
