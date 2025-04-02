import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FileUploadProps {
  id: string;
  label: string;
  accept?: string;
  onChange: (file: File | null) => void;
  value?: File | null;
  previewUrl?: string;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  id,
  label,
  accept = 'image/*',
  onChange,
  value,
  previewUrl,
  className = '',
}) => {
  const [preview, setPreview] = useState<string | null>(previewUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onChange(file);
    
    // Create preview for image files
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (!file) {
      setPreview(previewUrl || null);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onChange(null);
    setPreview(null);
  };

  return (
    <div className={className}>
      <Label htmlFor={id} className="block mb-2">
        {label}
      </Label>
      
      <div className="flex flex-col gap-3">
        <Input
          id={id}
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="flex items-center gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClick}
            className="flex-1"
          >
            Browse...
          </Button>
          
          {(value || preview) && (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleClear}
              size="sm"
            >
              Clear
            </Button>
          )}
        </div>
        
        {value && (
          <p className="text-sm text-muted-foreground truncate">
            Selected: {value.name}
          </p>
        )}
        
        {preview && accept.includes('image') && (
          <div className="mt-2 relative w-full aspect-video rounded-md overflow-hidden border">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
