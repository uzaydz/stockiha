import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';

interface LossHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onOpenCreate: () => void;
}

const LossHeader: React.FC<LossHeaderProps> = ({ loading, onRefresh, onOpenCreate }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <ArrowLeft className="h-6 w-6" />
        <h1 className="text-2xl font-bold">إدارة التصريح بالخسائر</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
        <Button onClick={onOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          تصريح خسارة جديد
        </Button>
      </div>
    </div>
  );
};

export default LossHeader;



















