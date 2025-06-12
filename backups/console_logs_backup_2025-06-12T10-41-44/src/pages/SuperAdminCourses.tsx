import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  BookOpen, 
  Users, 
  Clock, 
  BarChart3,
  Edit,
  Trash2,
  Play,
  FileText,
  Video,
  Upload
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  stats?: {
    total_sections: number;
    total_lessons: number;
    total_duration: number;
    total_students: number;
  };
}

interface Section {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  description: string;
  order_index: number;
  is_active: boolean;
  lessons_count?: number;
}

interface Lesson {
  id: string;
  section_id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  video_url: string;
  video_type: string;
  duration: number;
  order_index: number;
  is_active: boolean;
  is_free: boolean;
}

const SuperAdminCourses: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'courses' | 'sections' | 'lessons'>('courses');

  // نماذج لإضافة/تعديل
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // نموذج الدورة
  const [courseForm, setCourseForm] = useState({
    title: '',
    slug: '',
    description: '',
    icon: 'BookOpen',
    color: 'bg-blue-500'
  });

  // نموذج القسم
  const [sectionForm, setSectionForm] = useState({
    title: '',
    slug: '',
    description: ''
  });

  // نموذج الدرس
  const [lessonForm, setLessonForm] = useState({
    title: '',
    slug: '',
    description: '',
    content: '',
    video_url: '',
    video_type: 'vimeo',
    duration: 0,
    is_free: false
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('order_index');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('course_sections')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
    }
  };

  const loadLessons = async (sectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('section_id', sectionId)
        .order('order_index');

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
    }
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('courses')
          .update(courseForm)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([{
            ...courseForm,
            order_index: courses.length
          }]);
        if (error) throw error;
      }
      
      setShowCourseForm(false);
      setEditingItem(null);
      setCourseForm({ title: '', slug: '', description: '', icon: 'BookOpen', color: 'bg-blue-500' });
      loadCourses();
    } catch (error) {
    }
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('course_sections')
          .update(sectionForm)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('course_sections')
          .insert([{
            ...sectionForm,
            course_id: selectedCourse.id,
            order_index: sections.length
          }]);
        if (error) throw error;
      }
      
      setShowSectionForm(false);
      setEditingItem(null);
      setSectionForm({ title: '', slug: '', description: '' });
      loadSections(selectedCourse.id);
    } catch (error) {
    }
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection) return;

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('course_lessons')
          .update(lessonForm)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('course_lessons')
          .insert([{
            ...lessonForm,
            section_id: selectedSection.id,
            order_index: lessons.length
          }]);
        if (error) throw error;
      }
      
      setShowLessonForm(false);
      setEditingItem(null);
      setLessonForm({
        title: '', slug: '', description: '', content: '',
        video_url: '', video_type: 'vimeo', duration: 0, is_free: false
      });
      loadLessons(selectedSection.id);
    } catch (error) {
    }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدورة؟')) return;
    
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      loadCourses();
    } catch (error) {
    }
  };

  const deleteSection = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    
    try {
      const { error } = await supabase
        .from('course_sections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      if (selectedCourse) loadSections(selectedCourse.id);
    } catch (error) {
    }
  };

  const deleteLesson = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدرس؟')) return;
    
    try {
      const { error } = await supabase
        .from('course_lessons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      if (selectedSection) loadLessons(selectedSection.id);
    } catch (error) {
    }
  };

  const navigateToCourse = (course: Course) => {
    setSelectedCourse(course);
    setView('sections');
    loadSections(course.id);
  };

  const navigateToSection = (section: Section) => {
    setSelectedSection(section);
    setView('lessons');
    loadLessons(section.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* شريط التنقل */}
      <div className="mb-4 sm:mb-6">
        <nav className="flex items-center flex-wrap gap-2 text-sm text-gray-600">
          <button 
            onClick={() => {
              setView('courses');
              setSelectedCourse(null);
              setSelectedSection(null);
            }}
            className={`hover:text-blue-600 ${view === 'courses' ? 'text-blue-600 font-medium' : ''}`}
          >
            الدورات
          </button>
          {selectedCourse && (
            <>
              <span>/</span>
              <button 
                onClick={() => {
                  setView('sections');
                  setSelectedSection(null);
                }}
                className={`hover:text-blue-600 ${view === 'sections' ? 'text-blue-600 font-medium' : ''}`}
              >
                {selectedCourse.title}
              </button>
            </>
          )}
          {selectedSection && (
            <>
              <span>/</span>
              <span className="text-blue-600 font-medium">{selectedSection.title}</span>
            </>
          )}
        </nav>
      </div>

      {/* عرض الدورات */}
      {view === 'courses' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">إدارة الدورات التدريبية</h1>
            <button
              onClick={() => setShowCourseForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 w-full sm:w-auto"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">إضافة دورة جديدة</span>
              <span className="sm:hidden">إضافة دورة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow">
                <div className={`h-20 sm:h-24 ${course.color} rounded-t-lg flex items-center justify-center`}>
                  <BookOpen size={28} className="text-white sm:w-8 sm:h-8" />
                </div>
                <div className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold mb-2 line-clamp-2">{course.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2 text-sm sm:text-base">{course.description}</p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <BookOpen size={14} className="sm:w-4 sm:h-4" />
                        0 أقسام
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={14} className="sm:w-4 sm:h-4" />
                        0 طلاب
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => navigateToCourse(course)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                    >
                      إدارة المحتوى
                    </button>
                    <div className="flex gap-2 sm:gap-1">
                      <button
                        onClick={() => {
                          setEditingItem(course);
                          setCourseForm({
                            title: course.title,
                            slug: course.slug,
                            description: course.description,
                            icon: course.icon,
                            color: course.color
                          });
                          setShowCourseForm(true);
                        }}
                        className="flex-1 sm:flex-none p-2 text-gray-600 hover:text-blue-600 border rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="flex-1 sm:flex-none p-2 text-gray-600 hover:text-red-600 border rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* عرض الأقسام */}
      {view === 'sections' && selectedCourse && (
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              أقسام دورة: <span className="text-blue-600">{selectedCourse.title}</span>
            </h1>
            <button
              onClick={() => setShowSectionForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 w-full sm:w-auto"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">إضافة قسم جديد</span>
              <span className="sm:hidden">إضافة قسم</span>
            </button>
          </div>

          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.id} className="bg-white rounded-lg shadow-md border p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold mb-2">{section.title}</h3>
                    <p className="text-gray-600 mb-4 text-sm sm:text-base">{section.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Play size={16} />
                        0 دروس
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 lg:w-auto w-full">
                    <button
                      onClick={() => navigateToSection(section)}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 w-full sm:w-auto"
                    >
                      إدارة الدروس
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(section);
                          setSectionForm({
                            title: section.title,
                            slug: section.slug,
                            description: section.description
                          });
                          setShowSectionForm(true);
                        }}
                        className="flex-1 sm:flex-none p-2 text-gray-600 hover:text-blue-600 border rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteSection(section.id)}
                        className="flex-1 sm:flex-none p-2 text-gray-600 hover:text-red-600 border rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* عرض الدروس */}
      {view === 'lessons' && selectedSection && (
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              دروس قسم: <span className="text-green-600">{selectedSection.title}</span>
            </h1>
            <button
              onClick={() => setShowLessonForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 w-full sm:w-auto"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">إضافة درس جديد</span>
              <span className="sm:hidden">إضافة درس</span>
            </button>
          </div>

          <div className="space-y-4">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="bg-white rounded-lg shadow-md border p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <h3 className="text-lg sm:text-xl font-bold">{lesson.title}</h3>
                      {lesson.is_free && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded w-fit">
                          مجاني
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-4 text-sm sm:text-base">{lesson.description}</p>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-500">
                      {lesson.video_url && (
                        <span className="flex items-center gap-1">
                          <Video size={16} />
                          فيديو
                        </span>
                      )}
                      {lesson.duration > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock size={16} />
                          {lesson.duration} دقيقة
                        </span>
                      )}
                      {lesson.content && (
                        <span className="flex items-center gap-1">
                          <FileText size={16} />
                          محتوى نصي
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 lg:w-auto w-full">
                    <button
                      onClick={() => {
                        setEditingItem(lesson);
                        setLessonForm({
                          title: lesson.title,
                          slug: lesson.slug,
                          description: lesson.description,
                          content: lesson.content,
                          video_url: lesson.video_url,
                          video_type: lesson.video_type,
                          duration: lesson.duration,
                          is_free: lesson.is_free
                        });
                        setShowLessonForm(true);
                      }}
                      className="flex-1 sm:flex-none p-2 text-gray-600 hover:text-blue-600 border rounded"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => deleteLesson(lesson.id)}
                      className="flex-1 sm:flex-none p-2 text-gray-600 hover:text-red-600 border rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* نموذج إضافة/تعديل الدورة */}
      {showCourseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingItem ? 'تعديل الدورة' : 'إضافة دورة جديدة'}
            </h2>
            <form onSubmit={handleCourseSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">عنوان الدورة</label>
                <input
                  type="text"
                  value={courseForm.title}
                  onChange={(e) => {
                    setCourseForm({ ...courseForm, title: e.target.value });
                    if (!editingItem) {
                      setCourseForm({ 
                        ...courseForm, 
                        title: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, '-')
                      });
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">الرابط (Slug)</label>
                <input
                  type="text"
                  value={courseForm.slug}
                  onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">الوصف</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">اللون</label>
                <select
                  value={courseForm.color}
                  onChange={(e) => setCourseForm({ ...courseForm, color: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="bg-blue-500">أزرق</option>
                  <option value="bg-green-500">أخضر</option>
                  <option value="bg-purple-500">بنفسجي</option>
                  <option value="bg-orange-500">برتقالي</option>
                  <option value="bg-red-500">أحمر</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingItem ? 'تحديث' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCourseForm(false);
                    setEditingItem(null);
                    setCourseForm({ title: '', slug: '', description: '', icon: 'BookOpen', color: 'bg-blue-500' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نموذج إضافة/تعديل القسم */}
      {showSectionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingItem ? 'تعديل القسم' : 'إضافة قسم جديد'}
            </h2>
            <form onSubmit={handleSectionSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">عنوان القسم</label>
                <input
                  type="text"
                  value={sectionForm.title}
                  onChange={(e) => {
                    setSectionForm({ ...sectionForm, title: e.target.value });
                    if (!editingItem) {
                      setSectionForm({ 
                        ...sectionForm, 
                        title: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, '-')
                      });
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">الرابط (Slug)</label>
                <input
                  type="text"
                  value={sectionForm.slug}
                  onChange={(e) => setSectionForm({ ...sectionForm, slug: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">الوصف</label>
                <textarea
                  value={sectionForm.description}
                  onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingItem ? 'تحديث' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSectionForm(false);
                    setEditingItem(null);
                    setSectionForm({ title: '', slug: '', description: '' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نموذج إضافة/تعديل الدرس */}
      {showLessonForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingItem ? 'تعديل الدرس' : 'إضافة درس جديد'}
            </h2>
            <form onSubmit={handleLessonSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">عنوان الدرس</label>
                  <input
                    type="text"
                    value={lessonForm.title}
                    onChange={(e) => {
                      setLessonForm({ ...lessonForm, title: e.target.value });
                      if (!editingItem) {
                        setLessonForm({ 
                          ...lessonForm, 
                          title: e.target.value,
                          slug: e.target.value.toLowerCase().replace(/\s+/g, '-')
                        });
                      }
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">الرابط (Slug)</label>
                  <input
                    type="text"
                    value={lessonForm.slug}
                    onChange={(e) => setLessonForm({ ...lessonForm, slug: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">الوصف</label>
                <textarea
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">المحتوى النصي</label>
                <textarea
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={4}
                  placeholder="أدخل محتوى الدرس النصي هنا..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">رابط الفيديو</label>
                  <input
                    type="url"
                    value={lessonForm.video_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="https://vimeo.com/123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">نوع الفيديو</label>
                  <select
                    value={lessonForm.video_type}
                    onChange={(e) => setLessonForm({ ...lessonForm, video_type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="vimeo">Vimeo</option>
                    <option value="vadoo">Vadoo</option>
                    <option value="youtube">YouTube</option>
                    <option value="other">آخر</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">المدة (دقيقة)</label>
                  <input
                    type="number"
                    value={lessonForm.duration}
                    onChange={(e) => setLessonForm({ ...lessonForm, duration: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                    min="0"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={lessonForm.is_free}
                    onChange={(e) => setLessonForm({ ...lessonForm, is_free: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">درس مجاني</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingItem ? 'تحديث' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLessonForm(false);
                    setEditingItem(null);
                    setLessonForm({
                      title: '', slug: '', description: '', content: '',
                      video_url: '', video_type: 'vimeo', duration: 0, is_free: false
                    });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SuperAdminCourses;
