import { Upload, Image, FileSpreadsheet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

interface UploadSectionProps {
  title: string;
  description: string;
  acceptedFormats: string;
  onFileUpload: (file: File) => void;
  uploadedFileName?: string;
  icon: "image" | "data";
}

export const UploadSection = ({
  title,
  description,
  acceptedFormats,
  onFileUpload,
  uploadedFileName,
  icon,
}: UploadSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const IconComponent = icon === "image" ? Image : FileSpreadsheet;

  return (
    <Card className="p-6 border-4 border-[#8B4513] bg-[#F5E6D3] shadow-[4px_4px_0_#654321] hover:shadow-[6px_6px_0_#654321] transition-all">
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 border-4 border-[#8B4513] bg-[#2C1810] shadow-[2px_2px_0_#654321]">
          <IconComponent className="h-8 w-8 text-[#F5E6D3]" />
        </div>
        <div className="text-center border-b-2 border-[#8B4513] pb-3">
          <h3 className="text-lg font-bold text-[#2C1810] mb-1 font-headline uppercase tracking-wide">{title}</h3>
          <p className="text-sm text-[#654321] mb-2 font-body italic">{description}</p>
          <p className="text-xs text-[#4A3728] font-mono">{acceptedFormats}</p>
        </div>
        {uploadedFileName && (
          <div className="text-sm text-[#8B4513] font-semibold font-body border-2 border-[#8B4513] px-3 py-1 bg-[#DCC9B3]">
            ✓ {uploadedFileName}
          </div>
        )}
        <Button
          onClick={handleClick}
          className="bg-[#8B4513] hover:bg-[#654321] text-[#F5E6D3] border-2 border-[#654321] shadow-[3px_3px_0_#654321] hover:shadow-[4px_4px_0_#654321] transition-all font-body font-bold uppercase"
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploadedFileName ? "Change File" : "Upload File"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedFormats}
          onChange={handleFileChange}
        />
      </div>
    </Card>
  );
};
