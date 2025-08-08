import React from 'react';
import { ReviewsComponent } from '@/types/advanced-description';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Trash2, Edit, Star, MessageSquare, UserCheck, User } from 'lucide-react';

interface ReviewsComponentPreviewProps {
  component: ReviewsComponent;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export const ReviewsComponentPreview: React.FC<ReviewsComponentPreviewProps> = ({
  component,
  onEdit,
  onDelete,
  className
}) => {
  const reviews = component.data.reviews;
  const hasReviews = reviews.length > 0;

  // Calculate average rating
  const averageRating = hasReviews 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  const displayedReviews = reviews.slice(0, component.settings.maxReviews);

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const stars = [];
    const sizeClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={cn(
            sizeClass,
            i <= rating 
              ? 'text-yellow-400 fill-current' 
              : 'text-gray-300 dark:text-gray-600'
          )}
        />
      );
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
      "border-border/50 bg-card/50 backdrop-blur-sm",
      className
    )}>
      {/* Action buttons */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="sm"
          onClick={onEdit}
          className="h-8 w-8 p-0 bg-background/90 hover:bg-background"
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Component type badge */}
      <div className="absolute top-2 left-2 z-10">
        <Badge variant="secondary" className="text-xs bg-background/90">
          <MessageSquare className="w-3 h-3 mr-1" />
          آراء العملاء
        </Badge>
      </div>

      <div className="p-4 pt-12">
        {/* Header */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {component.data.title}
          </h3>
          
          {/* Average rating */}
          {component.data.showAverageRating && hasReviews && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                {renderStars(Math.round(averageRating), 'md')}
              </div>
              <span className="text-lg font-bold text-foreground">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">
                ({reviews.length} {reviews.length === 1 ? 'تقييم' : 'تقييمات'})
              </span>
            </div>
          )}
        </div>

        {hasReviews ? (
          <div className={cn(
            "gap-4",
            component.settings.layout === 'grid' && "grid grid-cols-1 md:grid-cols-2",
            component.settings.layout === 'list' && "space-y-4",
            component.settings.layout === 'slider' && "flex gap-4 overflow-x-auto pb-2"
          )}>
            {displayedReviews.map((review) => (
              <div
                key={review.id}
                className={cn(
                  "bg-muted/30 rounded-lg p-4 border border-border/50",
                  component.settings.layout === 'slider' && "flex-shrink-0 w-72"
                )}
              >
                {/* Review header */}
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={review.customerAvatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {review.customerName}
                      </h4>
                      {review.verified && component.settings.showVerificationBadge && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          <UserCheck className="w-3 h-3 mr-1" />
                          موثق
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(review.date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review content */}
                <p className="text-sm text-foreground leading-relaxed">
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground text-center mb-3">
              لم يتم إضافة آراء عملاء بعد
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEdit}
            >
              إضافة آراء
            </Button>
          </div>
        )}

        {/* Show more indicator */}
        {reviews.length > component.settings.maxReviews && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              عرض {component.settings.maxReviews} من {reviews.length} تقييم
            </p>
          </div>
        )}

        {/* Component info */}
        <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {reviews.length} {reviews.length === 1 ? 'تقييم' : 'تقييمات'}
          </span>
          <span>
            تخطيط: {
              component.settings.layout === 'grid' ? 'شبكة' :
              component.settings.layout === 'list' ? 'قائمة' : 'شريط تمرير'
            }
          </span>
        </div>
      </div>
    </Card>
  );
};