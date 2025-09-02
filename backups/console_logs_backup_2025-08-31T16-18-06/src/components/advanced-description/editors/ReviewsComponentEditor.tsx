import React, { useState } from 'react';
import { ReviewsComponent } from '@/types/advanced-description';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { MessageSquare, Settings, Plus, X, Star } from 'lucide-react';

interface ReviewsComponentEditorProps {
  component: ReviewsComponent;
  onChange: (component: ReviewsComponent) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const ReviewsComponentEditor: React.FC<ReviewsComponentEditorProps> = ({
  component,
  onChange,
  onCancel,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');

  const updateData = (updates: Partial<ReviewsComponent['data']>) => {
    onChange({
      ...component,
      data: { ...component.data, ...updates }
    });
  };

  const updateSettings = (updates: Partial<ReviewsComponent['settings']>) => {
    onChange({
      ...component,
      settings: { ...component.settings, ...updates }
    });
  };

  const addReview = () => {
    const newReview = {
      id: `review-${Date.now()}`,
      customerName: '',
      rating: 5,
      comment: '',
      date: new Date().toISOString(),
      verified: false
    };
    updateData({
      reviews: [...component.data.reviews, newReview]
    });
  };

  const removeReview = (reviewId: string) => {
    updateData({
      reviews: component.data.reviews.filter(review => review.id !== reviewId)
    });
  };

  const updateReview = (reviewId: string, updates: Partial<{
    customerName: string;
    rating: number;
    comment: string;
    date: string;
    verified: boolean;
  }>) => {
    updateData({
      reviews: component.data.reviews.map(review =>
        review.id === reviewId ? { ...review, ...updates } : review
      )
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">تحرير آراء العملاء</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button onClick={onSave}>
            حفظ
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
        <Button
          variant={activeTab === 'content' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('content')}
          className="flex-1"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          المحتوى
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('settings')}
          className="flex-1"
        >
          <Settings className="w-4 h-4 mr-2" />
          الإعدادات
        </Button>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">عنوان القسم</Label>
            <Input
              id="title"
              value={component.data.title}
              onChange={(e) => updateData({ title: e.target.value })}
              placeholder="آراء العملاء"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label htmlFor="subtitle">نص فرعي</Label>
            <Textarea
              id="subtitle"
              value={component.data.subtitle}
              onChange={(e) => updateData({ subtitle: e.target.value })}
              placeholder="ما يقوله عملاؤنا عن هذا المنتج"
              rows={2}
            />
          </div>

          {/* Reviews */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  آراء العملاء ({component.data.reviews.length})
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addReview}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة رأي
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {component.data.reviews.map((review, index) => (
                  <div key={review.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">رأي {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReview(review.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Customer Name */}
                    <div className="space-y-2">
                      <Label>اسم العميل</Label>
                      <Input
                        value={review.customerName}
                        onChange={(e) => updateReview(review.id, { customerName: e.target.value })}
                        placeholder="اسم العميل"
                      />
                    </div>

                    {/* Rating */}
                    <div className="space-y-2">
                      <Label>التقييم</Label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Button
                            key={star}
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateReview(review.id, { rating: star })}
                            className={cn(
                              "p-1",
                              star <= review.rating 
                                ? "text-yellow-500 hover:text-yellow-600" 
                                : "text-gray-300 hover:text-gray-400"
                            )}
                          >
                            <Star className="w-5 h-5 fill-current" />
                          </Button>
                        ))}
                        <span className="text-sm text-muted-foreground mr-2">
                          {review.rating}/5
                        </span>
                      </div>
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                      <Label>التعليق</Label>
                      <Textarea
                        value={review.comment}
                        onChange={(e) => updateReview(review.id, { comment: e.target.value })}
                        placeholder="تعليق العميل"
                        rows={3}
                      />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                      <Label>التاريخ</Label>
                      <Input
                        type="date"
                        value={review.date.split('T')[0]}
                        onChange={(e) => {
                          const newDate = new Date(e.target.value);
                          updateReview(review.id, { date: newDate.toISOString() });
                        }}
                      />
                    </div>

                    {/* Verified */}
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Switch
                        checked={review.verified}
                        onCheckedChange={(checked) => updateReview(review.id, { verified: checked })}
                      />
                      <Label>رأي موثق</Label>
                    </div>
                  </div>
                ))}

                {component.data.reviews.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد آراء بعد</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addReview}
                      className="mt-2"
                    >
                      إضافة رأي أول
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Layout */}
          <div className="space-y-2">
            <Label>نوع العرض</Label>
            <Select
              value={component.settings.layout}
              onValueChange={(value) => updateSettings({ layout: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">شبكة</SelectItem>
                <SelectItem value="list">قائمة</SelectItem>
                <SelectItem value="slider">سلايدر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show Average Rating */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>إظهار متوسط التقييم</Label>
              <p className="text-xs text-muted-foreground">
                عرض متوسط تقييم جميع الآراء
              </p>
            </div>
            <Switch
              checked={component.settings.showAverageRating}
              onCheckedChange={(checked) => updateSettings({ showAverageRating: checked })}
            />
          </div>

          {/* Show Verified Badge */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>إظهار شارة الرأي الموثق</Label>
              <p className="text-xs text-muted-foreground">
                عرض شارة للآراء الموثقة
              </p>
            </div>
            <Switch
              checked={component.settings.showVerifiedBadge}
              onCheckedChange={(checked) => updateSettings({ showVerifiedBadge: checked })}
            />
          </div>

          {/* Max Reviews */}
          <div className="space-y-2">
            <Label>الحد الأقصى للآراء المعروضة</Label>
            <Slider
              value={[component.settings.maxReviews]}
              onValueChange={([value]) => updateSettings({ maxReviews: value })}
              min={1}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-center">
              {component.settings.maxReviews} رأي
            </div>
          </div>

          {/* Auto Play (for slider layout) */}
          {component.settings.layout === 'slider' && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>التشغيل التلقائي</Label>
                  <p className="text-xs text-muted-foreground">
                    تبديل الآراء تلقائياً
                  </p>
                </div>
                <Switch
                  checked={component.settings.autoPlay}
                  onCheckedChange={(checked) => updateSettings({ autoPlay: checked })}
                />
              </div>

              {component.settings.autoPlay && (
                <div className="space-y-2">
                  <Label>سرعة التشغيل التلقائي (ثانية)</Label>
                  <Slider
                    value={[component.settings.autoPlaySpeed]}
                    onValueChange={([value]) => updateSettings({ autoPlaySpeed: value })}
                    min={2}
                    max={10}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {component.settings.autoPlaySpeed} ثانية
                  </div>
                </div>
              )}
            </>
          )}

          {/* Show Date */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>إظهار التاريخ</Label>
              <p className="text-xs text-muted-foreground">
                عرض تاريخ الرأي
              </p>
            </div>
            <Switch
              checked={component.settings.showDate}
              onCheckedChange={(checked) => updateSettings({ showDate: checked })}
            />
          </div>
        </div>
      )}
    </div>
  );
};
