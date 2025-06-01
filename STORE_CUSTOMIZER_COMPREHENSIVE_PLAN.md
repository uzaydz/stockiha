# خطة شاملة لمحرر المتجر (Store Customizer) - 2025

## نظرة عامة على المشروع

### الهدف الرئيسي
تطوير محرر بصري متطور للمتاجر الإلكترونية يمكّن المستخدمين من تخصيص متاجرهم بطريقة تفاعلية وفورية (WYSIWYG) مع التركيز على:
- تجربة مستخدم سلسة وبديهية
- أداء عالي وتقليل الضغط على قاعدة البيانات (Supabase)
- قابلية التوسع والصيانة
- اتباع أفضل الممارسات الحديثة (2025)

## 1. الرؤية التقنية والمعمارية

### المبادئ الأساسية
- **In-Context Editing**: التحرير المباشر ضمن السياق دون انتقال بين الشاشات
- **Optimistic UI**: تحديث الواجهة فوراً قبل التأكيد من الخادم
- **Client-Side First**: تخزين التغييرات محلياً ثم مزامنتها
- **Component-Based Architecture**: نظام مكونات قابل للإعادة والتوسع

### التقنيات الأساسية المختارة

#### إدارة الحالة - Zustand
```typescript
// Store Structure
interface EditorStore {
  // Canvas State
  selectedElementId: string | null
  hoveredElementId: string | null
  isEditMode: boolean
  
  // Page Configuration
  pageConfig: PageConfig
  isDirty: boolean
  lastSaved: Date | null
  
  // UI State
  openPanels: Set<string>
  isPreviewMode: boolean
  viewportSize: 'desktop' | 'tablet' | 'mobile'
  
  // History
  history: PageConfig[]
  historyIndex: number
  
  // Actions
  selectElement: (id: string | null) => void
  updateElement: (id: string, updates: Partial<ElementConfig>) => void
  saveChanges: () => Promise<void>
  undo: () => void
  redo: () => void
}
```

#### السحب والإفلات - dnd-kit
```typescript
// DnD Context Configuration
const dndConfig = {
  sensors: [
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  ],
  collisionDetection: closestCenter,
  modifiers: [restrictToVerticalAxis],
}
```

#### واجهة المستخدم - Radix UI + Tailwind CSS
```typescript
// Component System
- Radix UI للعناصر التفاعلية (Popover, Dialog, etc.)
- Tailwind CSS للتصميم والتخطيط
- Custom Design System للثبات البصري
```

## 2. هيكلة المكونات والمعمارية

### المكونات الرئيسية

#### 1. EditorProvider (Context Provider)
```typescript
interface EditorContextValue {
  store: EditorStore
  canvas: CanvasRef
  templates: TemplateLibrary
  history: HistoryManager
}

export const EditorProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const store = useEditorStore()
  const templates = useTemplateLibrary()
  const history = useHistoryManager(store)
  
  return (
    <EditorContext.Provider value={{ store, templates, history }}>
      {children}
    </EditorContext.Provider>
  )
}
```

#### 2. Canvas Component
```typescript
interface CanvasProps {
  pageConfig: PageConfig
  isEditMode: boolean
  onElementClick: (elementId: string) => void
  onElementHover: (elementId: string | null) => void
}

export const Canvas: FC<CanvasProps> = ({ pageConfig, isEditMode, onElementClick, onElementHover }) => {
  return (
    <DndContext {...dndConfig}>
      <div className="canvas-container" data-edit-mode={isEditMode}>
        {pageConfig.sections.map(section => (
          <EditableSection
            key={section.id}
            section={section}
            onEdit={onElementClick}
            onHover={onElementHover}
          />
        ))}
      </div>
    </DndContext>
  )
}
```

#### 3. EditableElement Component
```typescript
interface EditableElementProps {
  element: ElementConfig
  isSelected: boolean
  isHovered: boolean
  onEdit: () => void
}

export const EditableElement: FC<EditableElementProps> = ({ 
  element, 
  isSelected, 
  isHovered, 
  onEdit 
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: element.id,
    data: { type: element.type, element },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "editable-element",
        isSelected && "ring-2 ring-blue-500",
        isHovered && "ring-1 ring-blue-300",
        isDragging && "opacity-50"
      )}
      onClick={onEdit}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        ...element.styles
      }}
    >
      <ElementRenderer element={element} />
      {isSelected && <ElementControls element={element} />}
    </div>
  )
}
```

#### 4. ContextualPanel Component
```typescript
interface ContextualPanelProps {
  element: ElementConfig
  onUpdate: (updates: Partial<ElementConfig>) => void
  onClose: () => void
}

export const ContextualPanel: FC<ContextualPanelProps> = ({ 
  element, 
  onUpdate, 
  onClose 
}) => {
  return (
    <Popover open onOpenChange={onClose}>
      <PopoverContent className="w-80 p-4">
        <div className="space-y-4">
          <h3 className="font-semibold">{element.type} Settings</h3>
          
          <DynamicForm
            schema={getElementSchema(element.type)}
            values={element.properties}
            onChange={onUpdate}
          />
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => openTemplateSelector(element)}
            >
              Replace Template
            </Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

### 5. TemplateLibrary System
```typescript
interface Template {
  id: string
  name: string
  category: string
  thumbnail: string
  config: ElementConfig
  preview: string
}

interface TemplateLibraryProps {
  category?: string
  onSelect: (template: Template) => void
}

export const TemplateLibrary: FC<TemplateLibraryProps> = ({ 
  category, 
  onSelect 
}) => {
  const { templates, loading } = useTemplates(category)
  
  return (
    <div className="template-grid">
      {templates.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          onSelect={() => onSelect(template)}
        />
      ))}
    </div>
  )
}
```

## 3. إدارة البيانات وتحسين الأداء

### استراتيجية تقليل الضغط على Supabase

#### 1. Client-Side Caching مع Debounce
```typescript
// Auto-save with debounce
const useAutoSave = (pageConfig: PageConfig, isDirty: boolean) => {
  const debouncedSave = useMemo(
    () => debounce(async (config: PageConfig) => {
      await supabase
        .from('store_pages')
        .update({ config: config })
        .eq('id', config.id)
    }, 2000),
    []
  )
  
  useEffect(() => {
    if (isDirty) {
      debouncedSave(pageConfig)
    }
  }, [pageConfig, isDirty, debouncedSave])
}
```

#### 2. Optimistic Updates
```typescript
const useOptimisticUpdate = () => {
  const updateElement = useCallback(async (
    elementId: string, 
    updates: Partial<ElementConfig>
  ) => {
    // تحديث فوري في الواجهة
    updateElementImmediate(elementId, updates)
    
    try {
      // إرسال التحديث للخادم
      await updateElementOnServer(elementId, updates)
    } catch (error) {
      // التراجع في حالة الفشل
      revertElementUpdate(elementId)
      showError('Failed to save changes')
    }
  }, [])
  
  return { updateElement }
}
```

#### 3. Diff-Based Updates
```typescript
const generateDiff = (oldConfig: PageConfig, newConfig: PageConfig) => {
  const changes: ConfigChange[] = []
  
  // مقارنة العناصر وإنشاء قائمة بالتغييرات فقط
  const diffElements = (oldElements: ElementConfig[], newElements: ElementConfig[]) => {
    // Implementation for detecting actual changes
  }
  
  return changes
}

const applyDiffToServer = async (changes: ConfigChange[]) => {
  // إرسال التغييرات فقط بدلاً من الكونفيغ كاملاً
  await supabase.rpc('apply_config_changes', { changes })
}
```

### 4. تحسين التحميل والأداء

#### Code Splitting للمكونات
```typescript
// Lazy loading للمحرر
const VisualEditor = lazy(() => import('./VisualEditor'))
const TemplateSelector = lazy(() => import('./TemplateSelector'))
const AdvancedSettings = lazy(() => import('./AdvancedSettings'))

// استخدام Suspense
<Suspense fallback={<EditorSkeleton />}>
  <VisualEditor />
</Suspense>
```

#### Virtual Scrolling للقوائم الطويلة
```typescript
// للقوائم الطويلة من القوالب
import { FixedSizeList as List } from 'react-window'

const VirtualTemplateList = ({ templates }: { templates: Template[] }) => (
  <List
    height={400}
    itemCount={templates.length}
    itemSize={120}
    itemData={templates}
  >
    {TemplateRow}
  </List>
)
```

## 5. تجربة المستخدم (UX) المتقدمة

### Visual Affordances
```scss
// CSS للإشارة إلى العناصر القابلة للتحرير
.editable-element {
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    outline: 2px dashed #3b82f6;
    outline-offset: 2px;
  }
  
  &.selected {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  
  &::after {
    content: '✎';
    position: absolute;
    top: -8px;
    right: -8px;
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  &:hover::after {
    opacity: 1;
  }
}
```

### Keyboard Shortcuts
```typescript
const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault()
            if (event.shiftKey) {
              redo()
            } else {
              undo()
            }
            break
          case 's':
            event.preventDefault()
            saveChanges()
            break
          case 'Escape':
            clearSelection()
            break
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
```

### Responsive Preview
```typescript
const useResponsivePreview = () => {
  const [viewport, setViewport] = useState<ViewportSize>('desktop')
  
  const viewportSizes = {
    desktop: { width: '100%', height: '100%' },
    tablet: { width: '768px', height: '1024px' },
    mobile: { width: '375px', height: '667px' },
  }
  
  return {
    viewport,
    setViewport,
    viewportStyle: viewportSizes[viewport],
  }
}
```

## 6. النظام الأمني والأذونات

### Role-Based Access Control
```typescript
interface UserPermissions {
  canEditDesign: boolean
  canEditProducts: boolean
  canEditSettings: boolean
  canPublish: boolean
}

const usePermissions = (userId: string) => {
  const { data: permissions } = useQuery(
    ['permissions', userId],
    () => getUserPermissions(userId),
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  )
  
  return permissions
}
```

### التشفير والأمان
```typescript
// تشفير البيانات الحساسة قبل التخزين
const encryptSensitiveData = (data: any) => {
  // Implementation using crypto-js or similar
}

// Row Level Security في Supabase
const RLS_POLICIES = {
  store_pages: 'user_id = auth.uid() OR organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())',
  templates: 'is_public = true OR created_by = auth.uid()',
}
```

## 7. خريطة الطريق والمراحل

### المرحلة 1: الأساسيات (4-6 أسابيع)
- [ ] إعداد بنية المشروع الأساسية
- [ ] تطوير EditorProvider و Canvas
- [ ] تنفيذ النقر للتحرير الأساسي
- [ ] إضافة نظام الحفظ التلقائي

### المرحلة 2: التفاعل والسحب والإفلات (3-4 أسابيع)
- [ ] دمج dnd-kit للسحب والإفلات
- [ ] تطوير ContextualPanel
- [ ] إضافة نظام القوالب الأساسي
- [ ] تنفيذ Undo/Redo

### المرحلة 3: المكونات المتقدمة (4-5 أسابيع)
- [ ] تطوير مكتبة القوالب الكاملة
- [ ] إضافة المعاينة المتجاوبة
- [ ] تنفيذ نظام الطبقات
- [ ] تحسين الأداء والتحميل الكسول

### المرحلة 4: الميزات المتقدمة (3-4 أسابيع)
- [ ] نظام الأذونات والأدوار
- [ ] التعاون في الوقت الفعلي (اختياري)
- [ ] تصدير/استيراد القوالب
- [ ] تحليلات الاستخدام

### المرحلة 5: التحسين والنشر (2-3 أسابيع)
- [ ] اختبارات الأداء والتحسين
- [ ] اختبارات المستخدم النهائي
- [ ] توثيق شامل
- [ ] النشر والمراقبة

## 8. المتطلبات التقنية والبنية التحتية

### Dependencies الأساسية
```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@radix-ui/react-popover": "^1.1.1",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.53.0",
    "framer-motion": "^12.6.2",
    "lodash-es": "^4.17.21",
    "immer": "^10.1.1",
    "@tanstack/react-query": "^5.56.2"
  }
}
```

### Supabase Schema
```sql
-- Store Pages Table
CREATE TABLE store_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates Table
CREATE TABLE page_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  config JSONB NOT NULL,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE store_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_templates ENABLE ROW LEVEL SECURITY;
```

## 9. معايير النجاح ومؤشرات الأداء

### المقاييس التقنية
- **وقت التحميل الأولي**: < 3 ثوانٍ
- **وقت الاستجابة للتحرير**: < 100ms
- **عدد طلبات قاعدة البيانات**: تقليل بنسبة 70%
- **معدل نجاح الحفظ**: > 99.5%

### مقاييس تجربة المستخدم
- **سهولة الاستخدام**: معدل إكمال المهام > 85%
- **رضا المستخدم**: درجة NPS > 50
- **وقت التعلم**: < 15 دقيقة للمهام الأساسية

### مقاييس الأعمال
- **زيادة الاستخدام**: 40% زيادة في استخدام أدوات التخصيص
- **تقليل طلبات الدعم**: 60% تقليل في طلبات المساعدة
- **زيادة الاحتفاظ**: 25% تحسن في معدل الاحتفاظ بالعملاء

## 10. الأمان والامتثال

### أمان البيانات
- تشفير البيانات في حالة السكون والحركة
- مراجعة دورية للأذونات
- تسجيل جميع العمليات الحساسة
- النسخ الاحتياطي التلقائي

### الامتثال
- GDPR للمستخدمين الأوروبيين
- SOC 2 للعملاء المؤسسيين
- ISO 27001 لأمان المعلومات

## الخلاصة

هذه الخطة الشاملة تضمن بناء محرر متجر متطور وقابل للتوسع باستخدام أحدث التقنيات وأفضل الممارسات. التركيز على الأداء وتجربة المستخدم وتقليل الضغط على قاعدة البيانات سيضمن نجاح المشروع وقابليته للنمو مع احتياجات المستخدمين المتزايدة. 