import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StoreAboutProps {
  title?: string;
  subtitle?: string;
  description?: string;
  features?: string[];
  image?: string;
  storeInfo?: {
    yearFounded?: number;
    customersCount?: number;
    productsCount?: number;
    branches?: number;
  };
}

const defaultFeatures = [
  'منتجات أصلية بضمان الوكيل',
  'شحن سريع لجميع مناطق المملكة',
  'دعم فني متخصص',
  'خدمة ما بعد البيع'
];

const defaultStoreInfo = {
  yearFounded: 2010,
  customersCount: 12000,
  productsCount: 1500,
  branches: 6
};

const defaultImage = 'https://images.unsplash.com/photo-1612690669207-fed642192c40?q=80&w=1740';

const defaultDescription = 'تأسس متجرنا منذ أكثر من عشر سنوات بهدف تقديم أحدث منتجات التكنولوجيا بأسعار منافسة وجودة عالية. نحن نفخر بتوفير تجربة تسوق متميزة لعملائنا من خلال فريق متخصص يقدم المشورة والدعم الفني المستمر. نلتزم بتوفير منتجات أصلية بضمان الوكيل ونسعى دائماً لتلبية احتياجات عملائنا وتجاوز توقعاتهم.';

const StoreAbout = ({
  title = 'عن متجرنا',
  subtitle = 'متجر إلكترونيات وتقنية متميز',
  description = defaultDescription,
  features = defaultFeatures,
  image = defaultImage,
  storeInfo = defaultStoreInfo
}: StoreAboutProps) => {
  // تأثيرات الحركة
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  // التأكد من أن description هو string وليس null أو undefined
  const descriptionText = description || defaultDescription;
  const paragraphs = descriptionText.split('\n');

  return (
    <section className="py-24 bg-muted/30">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
          >
            <motion.div 
              initial={{ scale: 1 }}
              whileInView={{ scale: 1.01 }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            >
              <img 
                src={image} 
                alt="صورة المتجر" 
                className="rounded-2xl shadow-xl w-full object-cover h-[500px]" 
              />
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
          >
            <h3 className="text-primary font-semibold mb-4 text-lg">{title}</h3>
            <h2 className="text-3xl font-bold mb-6">{subtitle}</h2>
            
            <div className="space-y-4 text-muted-foreground mb-8">
              {paragraphs.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              {storeInfo.yearFounded && (
                <div className="flex flex-col p-4 rounded-lg bg-background shadow-sm">
                  <span className="text-3xl font-bold text-primary mb-1">{storeInfo.yearFounded}</span>
                  <span className="text-sm text-muted-foreground">سنة التأسيس</span>
                </div>
              )}
              
              {storeInfo.customersCount && (
                <div className="flex flex-col p-4 rounded-lg bg-background shadow-sm">
                  <span className="text-3xl font-bold text-primary mb-1">{storeInfo.customersCount}+</span>
                  <span className="text-sm text-muted-foreground">عميل سعيد</span>
                </div>
              )}
              
              {storeInfo.productsCount && (
                <div className="flex flex-col p-4 rounded-lg bg-background shadow-sm">
                  <span className="text-3xl font-bold text-primary mb-1">{storeInfo.productsCount}+</span>
                  <span className="text-sm text-muted-foreground">منتج متنوع</span>
                </div>
              )}
              
              {storeInfo.branches && (
                <div className="flex flex-col p-4 rounded-lg bg-background shadow-sm">
                  <span className="text-3xl font-bold text-primary mb-1">{storeInfo.branches}</span>
                  <span className="text-sm text-muted-foreground">فروع في المملكة</span>
                </div>
              )}
            </div>

            <Separator className="my-8" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <Link to="/about">
              <Button 
                className="group"
                variant="default"
              >
                <span>تعرف على المزيد عنا</span>
                <ArrowUpRight className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StoreAbout; 