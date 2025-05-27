import { motion } from 'framer-motion';

interface ProductDescriptionProps {
  description: string;
}

const ProductDescription = ({ description }: ProductDescriptionProps) => {
  if (!description) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-full my-16"
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center mb-8">
          <div className="h-px flex-1 bg-border"></div>
          <h2 className="text-xl font-medium text-foreground mx-4">تفاصيل المنتج</h2>
          <div className="h-px flex-1 bg-border"></div>
        </div>
        
        <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
          <div className="prose prose-lg max-w-none rtl dark:prose-invert">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {description}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductDescription;
