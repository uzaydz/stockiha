import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@/components/ui/toaster';

// Import custom hooks
import { useLandingPageEditor } from './hooks/useLandingPageEditor';
import { useDragDrop } from './hooks/useDragDrop';
import { useRecentComponents } from './hooks/useRecentComponents';

// Import components
import SidebarNavigation from './components/SidebarNavigation';
import MainCanvas from './components/MainCanvas';
import DeleteConfirmationDialog from './components/DeleteConfirmationDialog';

// Import panel contents
import ComponentsPanel from './panels/ComponentsPanel';
import SettingsPanel from './panels/SettingsPanel';
import LayersPanel from '../../../src/components/landing-page-builder/panels/LayersPanel';

// Import types
import { LandingPage } from './types';

// Import styles
import './styles/drag-drop.css';

interface LandingPageEditorProps {
  page: LandingPage;
  onPageUpdate: (page: LandingPage) => void;
}

/**
 * محرر صفحة الهبوط الرئيسي - نسخة محسنة ومقسمة إلى مكونات
 */
const LandingPageEditor: React.FC<LandingPageEditorProps> = ({ page, onPageUpdate }) => {
  const { t } = useTranslation();
  const [activePanel, setActivePanel] = useState<string>('');
  
  // استخدام الـ hooks المخصصة لإدارة الحالة والسحب والإفلات
  const {
    activeComponentId,
    setActiveComponentId,
    hoveredComponentId,
    setHoveredComponentId,
    showDeleteDialog,
    setShowDeleteDialog,
    getActiveComponent,
    addComponent,
    duplicateComponent,
    removeComponent,
    moveComponentUp,
    moveComponentDown,
    toggleComponentActive,
    updateComponentSettings,
  } = useLandingPageEditor(page, onPageUpdate);
  
  const {
    sensors,
    draggedComponent,
    dropAnimation,
    modifiers,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
  } = useDragDrop(page, onPageUpdate);
  
  const { addToRecent } = useRecentComponents();
  
  // الحصول على المكون النشط
  const activeComponent = getActiveComponent();
  
  // معالج تأكيد الحذف
  const handleConfirmDelete = () => {
    if (showDeleteDialog) {
      removeComponent(showDeleteDialog);
    }
  };
  
  // معالج مدمج لإضافة مكون مع تحديث قائمة المستخدم مؤخرًا
  const handleAddComponent = (type: string) => {
    addComponent(type);
    addToRecent(type);
  };

  // يتم استدعائها عند النقر على أيقونة المكونات في الشريط الجانبي
  const handleOpenComponentsPanel = () => {
    setActivePanel('components');
  };

  // يتم استدعائها عند تنشيط مكون (ستفتح لوحة الإعدادات تلقائيًا)
  const handleActivateComponent = (id: string) => {
    setActiveComponentId(id);
    setActivePanel('settings');
  };

  // تحديد محتوى اللوحة النشطة
  const renderActivePanelContent = () => {
    switch (activePanel) {
      case 'components':
        return (
          <ComponentsPanel onAddComponent={handleAddComponent} />
        );
      case 'settings':
        return (
          <SettingsPanel 
            activeComponent={activeComponent} 
            onUpdateSettings={(settings) => activeComponentId && updateComponentSettings(activeComponentId, settings)} 
          />
        );
      case 'layers':
        return (
          <LayersPanel 
            page={page}
            activeComponentId={activeComponentId}
            onActivateComponent={handleActivateComponent}
            onToggleComponentActive={toggleComponentActive}
            onDuplicateComponent={duplicateComponent}
            onDeleteComponent={(id) => setShowDeleteDialog(id)}
            onMoveComponentUp={moveComponentUp}
            onMoveComponentDown={moveComponentDown}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="h-[calc(100vh-160px)] relative">
      {/* منطقة المحتوى الرئيسية */}
      <div className="h-full pl-12">
        <MainCanvas
          page={page}
          activeComponentId={activeComponentId}
          hoveredComponentId={hoveredComponentId}
          draggedComponent={draggedComponent}
          sensors={sensors}
          modifiers={modifiers}
          dropAnimation={dropAnimation}
          onActivateComponent={handleActivateComponent}
          onToggleComponentActive={toggleComponentActive}
          onDuplicateComponent={duplicateComponent}
          onDeleteComponent={(id) => setShowDeleteDialog(id)}
          onMoveComponentUp={moveComponentUp}
          onMoveComponentDown={moveComponentDown}
          onHoverComponent={setHoveredComponentId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          onOpenComponentsPanel={handleOpenComponentsPanel}
        />
      </div>

      {/* القائمة الجانبية مع اللوحة المنبثقة */}
      <SidebarNavigation 
        activePanel={activePanel}
        onPanelChange={setActivePanel}
      >
        {renderActivePanelContent()}
      </SidebarNavigation>
      
      {/* نافذة تأكيد الحذف */}
      <DeleteConfirmationDialog 
        isOpen={showDeleteDialog !== null}
        onClose={() => setShowDeleteDialog(null)}
        onConfirm={handleConfirmDelete}
      />
      
      {/* الإشعارات */}
      <Toaster />
    </div>
  );
};

export default LandingPageEditor;
 
 
 