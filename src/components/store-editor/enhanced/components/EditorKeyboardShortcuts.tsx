import React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useEnhancedStoreEditor } from '../store'

export const EditorKeyboardShortcuts: React.FC = () => {
  const {
    settings,
    saveChanges,
    undo,
    redo,
    setViewport,
    setMode,
    selectAll,
    clearSelection,
    deleteElements,
    duplicateElements,
    selectedElementIds,
  } = useEnhancedStoreEditor()

  // التحقق من تفعيل اختصارات المفاتيح
  const enabled = settings.enableKeyboardShortcuts

  // اختصارات الحفظ والتراجع
  useHotkeys('ctrl+s, cmd+s', (e) => {
    e.preventDefault()
    if (enabled) saveChanges()
  }, { enableOnContentEditable: true })

  useHotkeys('ctrl+z, cmd+z', (e) => {
    e.preventDefault()
    if (enabled) undo()
  }, { enableOnContentEditable: true })

  useHotkeys('ctrl+y, cmd+y, ctrl+shift+z, cmd+shift+z', (e) => {
    e.preventDefault()
    if (enabled) redo()
  }, { enableOnContentEditable: true })

  // اختصارات التحديد
  useHotkeys('ctrl+a, cmd+a', (e) => {
    e.preventDefault()
    if (enabled) selectAll()
  }, { enableOnContentEditable: true })

  useHotkeys('escape', () => {
    if (enabled) clearSelection()
  })

  // اختصارات العناصر
  useHotkeys('delete, backspace', () => {
    if (enabled && selectedElementIds.length > 0) {
      deleteElements(selectedElementIds)
    }
  })

  useHotkeys('ctrl+d, cmd+d', (e) => {
    e.preventDefault()
    if (enabled && selectedElementIds.length > 0) {
      duplicateElements(selectedElementIds)
    }
  })

  // اختصارات أوضاع العرض
  useHotkeys('1', () => {
    if (enabled) setViewport('desktop')
  })

  useHotkeys('2', () => {
    if (enabled) setViewport('tablet')
  })

  useHotkeys('3', () => {
    if (enabled) setViewport('mobile')
  })

  // اختصارات أوضاع المحرر
  useHotkeys('tab', (e) => {
    e.preventDefault()
    if (enabled) {
      // التنقل بين أوضاع المحرر
      const modes = ['design', 'preview', 'code'] as const
      const store = useEnhancedStoreEditor.getState()
      const currentIndex = modes.indexOf(store.mode)
      const nextMode = modes[(currentIndex + 1) % modes.length]
      setMode(nextMode)
    }
  })

  // لا يحتاج هذا المكون إلى عرض أي شيء
  return null
} 