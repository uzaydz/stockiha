import { ArrowLeft } from 'lucide-react';
import { ShoppingBag, DollarSign, Users, BarChart3, Bell, Calendar, Database, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isNew?: boolean;
}

const FeatureCard = ({ icon, title, description, isNew }: FeatureCardProps) => (
  <div className="relative group p-6 bg-card rounded-xl border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300">
    {isNew && (
      <Badge className="absolute top-3 right-3 bg-primary/10 text-primary">جديد</Badge>
    )}
    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
      {icon}
    </div>
    <h3 className="text-lg font-bold mb-2">{title}</h3>
    <p className="text-muted-foreground leading-relaxed mb-4">{description}</p>
    <Button variant="link" className="p-0 h-auto font-medium group" size="sm">
      <span>تعرف على المزيد</span>
      <ArrowLeft className="h-4 w-4 mr-1 group-hover:translate-x-1 transition-transform" />
    </Button>
  </div>
);

const Features = () => {
  const features = [
    {
      icon: <ShoppingBag className="h-6 w-6" />,
      title: "إدارة المبيعات",
      description: "إدارة المبيعات وتتبع الطلبات بسهولة، مع دعم للفواتير الضريبية وتقارير تحليلية مفصلة."
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: "إدارة المخزون",
      description: "تتبع المخزون في الوقت الفعلي، وإدارة المنتجات، وتنبيهات انخفاض المخزون التلقائية."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "إدارة العملاء",
      description: "قاعدة بيانات عملاء متكاملة تساعدك على تتبع المعلومات وتاريخ المعاملات وتفضيلات العملاء."
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "جدولة الخدمات",
      description: "نظام حجز وجدولة للخدمات مع تذكيرات تلقائية وتتبع حالة طلبات الخدمة.",
      isNew: true
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "التقارير والتحليلات",
      description: "تقارير مفصلة ولوحات تحكم تظهر الأداء والمبيعات والربحية واتجاهات السوق."
    },
    {
      icon: <Bell className="h-6 w-6" />,
      title: "الإشعارات الذكية",
      description: "إشعارات تلقائية للطلبات الجديدة، وانخفاض المخزون، والمواعيد القادمة، والمزيد."
    },
    {
      icon: <DollarSign className="h-6 w-6" />,
      title: "إدارة المالية",
      description: "تتبع المصروفات والإيرادات، وإدارة أرصدة العملاء، مع تكامل مع أنظمة الدفع الإلكتروني."
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: "تخصيص متقدم",
      description: "خيارات تخصيص متعددة للتقارير، والفواتير، والإعدادات، لتناسب احتياجات عملك الفريدة."
    }
  ];

  return (
    <section id="الميزات" className="py-20 bg-muted/30">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4">الميزات الرئيسية</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">كل ما تحتاجه لإدارة متجرك في مكان واحد</h2>
          <p className="text-lg text-muted-foreground">
            أدوات مبتكرة مصممة خصيصًا لتناسب احتياجات المتاجر العربية، تساعدك على تنمية أعمالك وزيادة كفاءتك
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              isNew={feature.isNew}
            />
          ))}
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-xl font-bold mb-4">مجموعة متكاملة من الحلول لكل احتياجات متجرك</h3>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            تم تصميم منصتنا خصيصًا لتلبية احتياجات السوق العربي، مع دعم كامل للغة العربية ومتوافقة مع الأنظمة الضريبية المحلية
          </p>
          <Button size="lg">اكتشف جميع الميزات</Button>
        </div>
      </div>
    </section>
  );
};

export default Features;
