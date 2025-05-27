import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Camera, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Shield,
  Clock,
  Save,
  Upload,
  Edit3,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Globe,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getCurrentUserProfile, 
  updateUserProfile, 
  uploadAvatar, 
  updateUserStatus,
  UserProfileData 
} from '@/lib/api/profile';

const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  
  // بيانات الملف الشخصي
  const [profile, setProfile] = useState<UserProfileData>({
    id: '',
    email: '',
    name: '',
    first_name: '',
    last_name: '',
    phone: '',
    avatar_url: '',
    job_title: '',
    bio: '',
    birth_date: '',
    gender: 'male',
    address: '',
    city: '',
    country: 'الجزائر',
    role: 'employee',
    is_org_admin: false,
    is_super_admin: false,
    status: 'offline',
    last_activity_at: '',
    created_at: '',
    whatsapp_phone: '',
    whatsapp_connected: false,
    whatsapp_enabled: false,
  });

  // جلب بيانات الملف الشخصي عند تحميل المكون
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      console.log('Current user:', user); // للتتبع
      setIsLoadingProfile(true);
      try {
        const profileData = await getCurrentUserProfile();
        console.log('Profile data loaded:', profileData); // للتتبع
        if (profileData) {
          setProfile(profileData);
        } else {
          // في حالة عدم وجود بيانات، استخدم بيانات المصادقة
          setProfile(prev => ({
            ...prev,
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || user.email?.split('@')[0] || ''
          }));
        }
      } catch (error) {
        console.error('خطأ في جلب بيانات الملف الشخصي:', error);
        toast.error('فشل في جلب بيانات الملف الشخصي');
        // استخدم بيانات المصادقة كبديل
        setProfile(prev => ({
          ...prev,
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || ''
        }));
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user]);

  // معالجة تحديث الحقول
  const handleInputChange = (field: keyof UserProfileData, value: string | boolean) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // معالجة رفع الصورة
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح');
      return;
    }

    // التحقق من حجم الملف (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setIsLoading(true);
    try {
      const result = await uploadAvatar(file);
      if (result.success && result.url) {
        setProfile(prev => ({
          ...prev,
          avatar_url: result.url!
        }));
        toast.success('تم رفع الصورة بنجاح');
      } else {
        toast.error(result.error || 'فشل في رفع الصورة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء رفع الصورة');
    } finally {
      setIsLoading(false);
    }
  };

  // معالجة حفظ التغييرات
  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const result = await updateUserProfile(profile);
      if (result.success && result.data) {
        setProfile(result.data);
        toast.success('تم حفظ التغييرات بنجاح');
        setIsEditing(false);
      } else {
        toast.error(result.error || 'فشل في حفظ التغييرات');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ التغييرات');
    } finally {
      setIsLoading(false);
    }
  };

  // معالجة تحديث الحالة
  const handleStatusChange = async (newStatus: 'online' | 'offline' | 'away' | 'busy') => {
    try {
      const result = await updateUserStatus(newStatus);
      if (result.success) {
        setProfile(prev => ({
          ...prev,
          status: newStatus,
          last_activity_at: new Date().toISOString()
        }));
        toast.success('تم تحديث الحالة بنجاح');
      } else {
        toast.error(result.error || 'فشل في تحديث الحالة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الحالة');
    }
  };

  // الحصول على الأحرف الأولى للاسم
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // الحصول على لون الحالة
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // الحصول على نص الحالة
  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'متصل';
      case 'away': return 'بعيد';
      case 'busy': return 'مشغول';
      default: return 'غير متصل';
    }
  };

  // الحصول على نص الدور
  const getRoleText = (role: string, isOrgAdmin?: boolean, isSuperAdmin?: boolean) => {
    if (isSuperAdmin) return 'مدير عام';
    if (isOrgAdmin) return 'مدير المؤسسة';
    
    switch (role) {
      case 'admin': return 'مدير';
      case 'manager': return 'مدير قسم';
      case 'employee': return 'موظف';
      case 'cashier': return 'أمين صندوق';
      case 'owner': return 'مالك';
      case 'customer': return 'عميل';
      default: return role;
    }
  };

  // عرض شاشة التحميل
  if (isLoadingProfile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">جاري تحميل بيانات الملف الشخصي...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* بطاقة المعلومات الأساسية */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                الملف الشخصي
              </CardTitle>
              <CardDescription>
                إدارة معلوماتك الشخصية وإعداداتك
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
              >
                {showSensitiveInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showSensitiveInfo ? 'إخفاء' : 'إظهار'} المعلومات الحساسة
              </Button>
              <Button
                variant={isEditing ? "secondary" : "default"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                disabled={isLoading}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {isEditing ? 'إلغاء التعديل' : 'تعديل الملف'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* قسم الصورة الشخصية والمعلومات الأساسية */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* الصورة الشخصية */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profile.avatar_url} alt={profile.name} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                
                {/* مؤشر الحالة */}
                <div className={`absolute bottom-2 right-2 h-6 w-6 rounded-full border-2 border-white ${getStatusColor(profile.status || 'offline')}`}>
                  <div className="h-full w-full rounded-full animate-pulse" />
                </div>
                
                {isEditing && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 mr-1" />
                    )}
                    تغيير
                  </Button>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              
              <div className="text-center">
                <Badge 
                  variant="secondary" 
                  className="mb-2 cursor-pointer"
                  onClick={() => isEditing && handleStatusChange(profile.status === 'online' ? 'offline' : 'online')}
                >
                  {getStatusText(profile.status || 'offline')}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  عضو منذ {profile.created_at ? new Date(profile.created_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                </p>
              </div>
            </div>

            {/* المعلومات الأساسية */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">الاسم الأول</Label>
                  <Input
                    id="first_name"
                    value={profile.first_name || ''}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">الاسم الأخير</Label>
                  <Input
                    id="last_name"
                    value={profile.last_name || ''}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="job_title">المنصب/الوظيفة</Label>
                <Input
                  id="job_title"
                  value={profile.job_title || ''}
                  onChange={(e) => handleInputChange('job_title', e.target.value)}
                  disabled={!isEditing}
                  placeholder="مثال: مدير المبيعات"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="bio">نبذة شخصية</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  disabled={!isEditing}
                  placeholder="اكتب نبذة مختصرة عن نفسك..."
                  className="mt-1 min-h-[80px]"
                />
              </div>

              {/* معلومات الدور والصلاحيات */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">
                  <Shield className="h-3 w-3 mr-1" />
                  {getRoleText(profile.role, profile.is_org_admin, profile.is_super_admin)}
                </Badge>
                {profile.is_org_admin && (
                  <Badge variant="secondary">
                    <Briefcase className="h-3 w-3 mr-1" />
                    مدير المؤسسة
                  </Badge>
                )}
                {currentOrganization && (
                  <Badge variant="outline">
                    <Globe className="h-3 w-3 mr-1" />
                    {currentOrganization.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* معلومات الاتصال */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Mail className="h-5 w-5" />
              معلومات الاتصال
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={showSensitiveInfo ? (profile.email || user?.email || '') : '***@***.***'}
                  disabled={true}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  لا يمكن تغيير البريد الإلكتروني
                </p>
                {/* معلومات إضافية للتتبع */}
                <p className="text-xs text-blue-600 mt-1">
                  Profile Email: {profile.email || 'غير محدد'} | Auth Email: {user?.email || 'غير محدد'}
                </p>
              </div>
              
              <div>
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={showSensitiveInfo ? (profile.phone || '') : '***-***-****'}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!isEditing}
                  placeholder="+213 XXX XXX XXX"
                  className="mt-1"
                />
              </div>
            </div>

            {/* معلومات WhatsApp */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="whatsapp_phone">رقم WhatsApp</Label>
                <Input
                  id="whatsapp_phone"
                  value={showSensitiveInfo ? (profile.whatsapp_phone || '') : '***-***-****'}
                  onChange={(e) => handleInputChange('whatsapp_phone', e.target.value)}
                  disabled={!isEditing}
                  placeholder="+213 XXX XXX XXX"
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-end gap-2">
                <Badge variant={profile.whatsapp_connected ? "default" : "secondary"}>
                  {profile.whatsapp_connected ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {profile.whatsapp_connected ? 'متصل' : 'غير متصل'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* المعلومات الشخصية */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              المعلومات الشخصية
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="birth_date">تاريخ الميلاد</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={profile.birth_date || ''}
                  onChange={(e) => handleInputChange('birth_date', e.target.value)}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="gender">الجنس</Label>
                <Select
                  value={profile.gender || 'male'}
                  onValueChange={(value) => handleInputChange('gender', value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختر الجنس" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                    <SelectItem value="other">آخر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="status">الحالة</Label>
                <Select
                  value={profile.status || 'offline'}
                  onValueChange={(value) => {
                    if (isEditing) {
                      handleStatusChange(value as 'online' | 'offline' | 'away' | 'busy');
                    }
                  }}
                  disabled={!isEditing}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">متصل</SelectItem>
                    <SelectItem value="away">بعيد</SelectItem>
                    <SelectItem value="busy">مشغول</SelectItem>
                    <SelectItem value="offline">غير متصل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* معلومات العنوان */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              معلومات العنوان
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">المدينة</Label>
                <Input
                  id="city"
                  value={profile.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  disabled={!isEditing}
                  placeholder="مثال: الجزائر العاصمة"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="country">الدولة</Label>
                <Input
                  id="country"
                  value={profile.country || 'الجزائر'}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="address">العنوان التفصيلي</Label>
              <Textarea
                id="address"
                value={profile.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                disabled={!isEditing}
                placeholder="اكتب العنوان التفصيلي..."
                className="mt-1"
              />
            </div>
          </div>

          {/* معلومات النشاط */}
          {profile.last_activity_at && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  آخر نشاط
                </h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(profile.last_activity_at).toLocaleString('ar-SA')}
                </p>
              </div>
            </>
          )}

          {/* أزرار الحفظ */}
          {isEditing && (
            <>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isLoading}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      حفظ التغييرات
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettings; 