import React from 'react';
import { TestimonialsComponent, TestimonialsSettings } from '../landing-page/TestimonialsComponent';
import { LandingPageComponent } from './types';

interface TestimonialsComponentPreviewProps {
  component: LandingPageComponent;
  onEdit?: () => void;
  onClick?: () => void;
  isEditing?: boolean;
  isSelected?: boolean;
}

const TestimonialsComponentPreview: React.FC<TestimonialsComponentPreviewProps> = ({
  component,
  onEdit,
  onClick,
  isEditing = false,
  isSelected = false,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
  };

  return (
    <div 
      className={`relative transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
      onClick={handleClick}
    >
      {/* Preview overlay (visible only when not editing and is selected) */}
      {!isEditing && isSelected && (
        <div className="absolute inset-0 bg-black bg-opacity-10 z-10 flex items-center justify-center">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200"
            onClick={handleEdit}
          >
            تعديل مكون آراء العملاء
          </button>
        </div>
      )}
      
      {/* The actual component */}
      <TestimonialsComponent
        settings={component.settings as TestimonialsSettings}
      />
    </div>
  );
};

export default TestimonialsComponentPreview; 