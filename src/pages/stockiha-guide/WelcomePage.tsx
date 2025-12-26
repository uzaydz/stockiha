import React from 'react';
import { GuidePage } from './Page';

export function WelcomePage({ pageNumber }: { pageNumber: number }) {
  return (
    <GuidePage chapter="ترحيب" title="رسالة ترحيب" pageNumber={pageNumber}>
      <p className="text-slate-700 leading-7">شريكنا في النجاح،</p>
      <p className="text-slate-700 leading-7">
        نضع بين أيديكم دليل الاستخدام الخاص بنظام سطوكيها، والذي يمثل بوابتكم نحو إتقان أدوات الإدارة الحديثة. لقد صُمم هذا النظام انطلاقاً من رؤية
        واضحة تهدف إلى تبسيط العمليات التجارية المعقدة، ودمج قوة التكنولوجيا مع سهولة الاستخدام، ليكون الركيزة الأساسية التي يعتمد عليها مشروعكم في
        النمو والتوسع.
      </p>
      <p className="text-slate-700 leading-7">
        إن هذا الدليل ليس مجرد سرد للمزايا التقنية، بل هو خارطة طريق مفصلة تم إعدادها بدقة لتمكينكم من استثمار كافة إمكانيات النظام؛ بدءاً من إدارة
        نقاط البيع والمخزون، ووصولاً إلى التحكم الكامل في تجارتكم الإلكترونية.
      </p>
      <p className="text-slate-700 leading-7">
        نحن في سطوكيها نؤمن بأن نجاحكم هو المعيار الحقيقي لنجاحنا. لذا، نجدد التزامنا الراسخ بتقديم حلول برمجية تتسم بالكفاءة والموثوقية، مع توفير
        الدعم الذي يليق بطموحاتكم.
      </p>
      <p className="text-slate-700 leading-7">نشكركم على ثقتكم الغالية، ونتطلع لأن نكون الشريك الداعم لقصة نجاحكم المستمرة.</p>

      <div className="pt-1">
        <p className="text-slate-800 font-bold">مع فائق التقدير والاحترام،</p>
        <p className="text-slate-700">إدارة نظام سطوكيها</p>
      </div>

      <div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 print-avoid-break">
        <h3 className="font-bold text-slate-900 text-sm mb-2">نحن هنا دائماً للاستماع إليكم وتقديم الدعم اللازم</h3>
        <div className="space-y-2 text-xs text-slate-700">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-700">البريد الإلكتروني</span>
            <span className="font-mono text-slate-800" dir="ltr">
              support@stockiha.com
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-700">الموقع الإلكتروني</span>
            <span className="font-mono text-slate-800" dir="ltr">
              www.stockiha.com
            </span>
          </div>
        </div>
      </div>
    </GuidePage>
  );
}

