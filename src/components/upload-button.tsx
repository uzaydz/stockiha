import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, Loader2 } from 'lucide-react';

interface UploadButtonProps {
  onUpload: (file: File) => void;
  uploading: boolean;
  accept?: string;
  className?: string;
}

export const UploadButton: React.FC<UploadButtonProps> = ({
  onUpload,
  uploading,
  accept = '*',
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      onUpload(file);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="file"
        ref={inputRef}
        accept={accept}
        onChange={handleFileChange}
        className="sr-only"
        disabled={uploading}
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleButtonClick}
        disabled={uploading}
        className="w-full flex items-center justify-center"
      >
        {uploading ? (
          <>
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            جاري الرفع...
          </>
        ) : (
          <>
            <UploadCloud className="ml-2 h-4 w-4" />
            {selectedFile ? selectedFile.name : 'اختر ملف'}
          </>
        )}
      </Button>
    </div>
  );
}; 