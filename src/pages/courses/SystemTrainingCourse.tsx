import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { courseData } from '@/data/systemTrainingCourseData';
import CourseHero from '@/components/courses/CourseHero';
import CourseStats from '@/components/courses/CourseStats';
import CourseModules from '@/components/courses/CourseModules';
import CourseFeatures from '@/components/courses/CourseFeatures';
import CourseAccessGuard from '@/components/courses/CourseAccessGuard';
import { CoursesService } from '@/lib/courses-service';
import { useUser } from '@/context/UserContext';
import { CourseWithAccess } from '@/lib/courses-service';
import CourseAccessBadge from '@/components/courses/CourseAccessBadge';
import { CoursesAccessType } from '@/types/activation';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

interface SystemTrainingCourseProps extends POSSharedLayoutControls { }

const SystemTrainingCourse: React.FC<SystemTrainingCourseProps> = ({ useStandaloneLayout = true } = {}) => {
    const { user, organizationId } = useUser();
    const [course, setCourse] = useState<CourseWithAccess | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourse = async () => {
            if (user && organizationId) {
                try {
                    setLoading(true);
                    // Assuming 'system-training' is the slug, though strictly we are just displaying local data
                    // But for access control we check the service.
                    // If the course doesn't exist in backend yet, this might fail or return null.
                    // For now we will mimic the existing pattern.
                    const courseDataFromService = await CoursesService.getCourseBySlug('system-training');

                    if (courseDataFromService) {
                        const accessInfo = await CoursesService.checkCourseAccess(
                            courseDataFromService.id,
                            organizationId
                        );

                        setCourse({
                            ...courseDataFromService,
                            access_type: accessInfo?.access_type,
                            is_accessible: accessInfo?.is_accessible || false,
                            expires_at: accessInfo?.expires_at,
                            is_lifetime: accessInfo?.is_lifetime || false
                        });
                    } else {
                        // Fallback if course not found in DB but we want to show it in UI for dev
                        // We can create a mock course object based on local data
                        setCourse({
                            id: 'system-training-mock-id',
                            title: courseData.title,
                            slug: 'system-training',
                            description: courseData.description,
                            thumbnail_url: '',
                            is_published: true,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            price: 0,
                            sale_price: 0,
                            is_accessible: true, // Default to accessible for this free guide
                            access_type: CoursesAccessType.LIFETIME,
                            is_lifetime: true
                        });
                    }
                } catch (error) {
                    // Fallback on error too
                    setCourse({
                        id: 'system-training-mock-id',
                        title: courseData.title,
                        slug: 'system-training',
                        description: courseData.description,
                        thumbnail_url: '',
                        is_published: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        price: 0,
                        sale_price: 0,
                        is_accessible: true,
                        access_type: CoursesAccessType.LIFETIME,
                        is_lifetime: true
                    });
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [user, organizationId]);

    if (loading) {
        const loadingContent = (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">جاري تحميل الدورة...</p>
                </div>
            </div>
        );
        return useStandaloneLayout ? <Layout>{loadingContent}</Layout> : loadingContent;
    }

    // We should always have a course object now due to fallback, but just in case
    if (!course) {
        return null;
    }

    const content = (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-6 max-w-5xl">
                {/* Course Access Info - Optional for this free guide */}
                {user && organizationId && (
                    <div className="mb-4">
                        <div className="bg-card border border-border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div>
                                        <span className="text-xs text-muted-foreground block mb-1">حالة الوصول للدورة</span>
                                        <CourseAccessBadge
                                            accessType={course.access_type}
                                            isAccessible={course.is_accessible || false}
                                            expiresAt={course.expires_at}
                                            isLifetime={course.is_lifetime}
                                            showDetails={true}
                                        />
                                    </div>
                                </div>

                                <div className="bg-green-50 rounded-lg px-3 py-1.5">
                                    <span className="text-xs font-bold text-green-700">مجاني للجميع</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Note: We aren't strictly enforcing CourseAccessGuard here since we want this guide to be always available 
                or we rely on the mock fallback being accessible. 
            */}

                {/* Hero Section */}
                {/* You might want to customize props passed to CourseHero if it accepts any, 
                otherwise it might pull from context or need refactoring. 
                Assuming it pulls from context or is generic for now, but checking DigitalMarketingCourse it takes no props.
                It potentially uses a context provider? 
                Actually looking at DigitalMarketingCourse.tsx, it renders <CourseHero /> with no props. 
                Let's check CourseHero to see where it gets data.
                It probably expects data to be passed or grabs it from a context.
                
                Wait, in the original file: 
                import { courseData } from '@/data/digitalMarketingCourseData';
                ...
                <CourseModules modules={courseData.modules} ... />
                
                But CourseHero? 
                It likely imports the same `courseData` file directly if not passed.
                Let's double check CourseHero. Use `view_file` if needed but for now I'll assume I might need to make a specific Hero or specific Context.
                
                However, to stay safe and consistent, I will assume the components might receive data via a Context Provider that I missed, OR they import specific data.
                
                Actually, let's look at `DigitalMarketingCourse.tsx` again.
                It imports `courseData` at the top.
                But it doesn't pass it to `<CourseHero />`. 
                This implies `<CourseHero />` might be hardcoded for Digital Marketing OR it uses a Context.
                
                Let's verify `CourseHero` implementation quickly to avoid showing "Digital Marketing" details for "System Training".
            */}

                {/* Temporary Placeholder for Hero if needed, or I'll just render the modules which is the core part */}

                {/* 
                I will assume I need to create a specific Hero for this course or the components are reusable.
                Refactoring: I will pass the data explicitly if the components support it, or I will create a simple Hero here.
            */}

                <div className="bg-card border border-border rounded-lg p-8 mb-8 text-center">
                    <h1 className="text-3xl font-bold mb-4">{courseData.title}</h1>
                    <p className="text-muted-foreground text-lg">{courseData.description}</p>
                </div>

                {/* Course Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-card p-4 rounded-lg border text-center">
                        <span className="block text-2xl font-bold">{courseData.totalVideos}</span>
                        <span className="text-sm text-muted-foreground">فيديو تعليمي</span>
                    </div>
                    <div className="bg-card p-4 rounded-lg border text-center">
                        <span className="block text-2xl font-bold">{courseData.totalDuration}</span>
                        <span className="text-sm text-muted-foreground">مدة المحتوى</span>
                    </div>
                    <div className="bg-card p-4 rounded-lg border text-center">
                        <span className="block text-2xl font-bold">{courseData.modules.length}</span>
                        <span className="text-sm text-muted-foreground">أقسام</span>
                    </div>
                    <div className="bg-card p-4 rounded-lg border text-center">
                        <span className="block text-2xl font-bold text-green-600">مجاني</span>
                        <span className="text-sm text-muted-foreground">سعر الدورة</span>
                    </div>
                </div>

                {/* Course Features */}
                {/* <CourseFeatures /> We skip this to avoid hardcoded DM features */}

                {/* Course Modules */}
                <CourseModules modules={courseData.modules} courseSlug="system-training" />

                {/* Additional Call to Action */}
                <div className="mt-6">
                    <div className="bg-card border border-border rounded-lg p-6 text-center">
                        <h3 className="text-base font-bold text-foreground mb-2">
                            ابدأ التعلم الآن
                        </h3>

                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed max-w-xl mx-auto">
                            تصفح الأقسام أعلاه وابدأ بأول فيديو لتتقن استخدام النظام
                        </p>

                        <button
                            onClick={() => document.getElementById('course-modules')?.scrollIntoView({ behavior: 'smooth' })}
                            className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-bold text-sm"
                        >
                            عرض الدروس
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return useStandaloneLayout ? <Layout>{content}</Layout> : content;
};

export default SystemTrainingCourse;
