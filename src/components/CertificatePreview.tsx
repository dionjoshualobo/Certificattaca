import { useState, useEffect, useRef } from "react";
import { Maximize2, Minimize2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoxPosition } from "./DraggableBox";
import { ColumnMapping } from "./DatasetPreview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CertificatePreviewProps {
  templateUrl: string;
  boxes: BoxPosition[];
  columnMappings: ColumnMapping[];
  columns: string[];
  firstRow: string[];
}

export const CertificatePreview = ({
  templateUrl,
  boxes,
  columnMappings,
  columns,
  firstRow,
}: CertificatePreviewProps) => {
  const [previewImage, setPreviewImage] = useState<string>("");
  const [isMaximized, setIsMaximized] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generatePreview = async () => {
    console.log("🖼️ Generate Preview clicked!", { 
      templateUrl, 
      boxesCount: boxes.length, 
      mappingsCount: columnMappings.length,
      firstRowLength: firstRow.length 
    });

    if (!templateUrl || boxes.length === 0 || columnMappings.length === 0) {
      console.log("❌ Cannot generate preview - missing requirements");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log("❌ Canvas not ready");
      return;
    }

    console.log("✅ Starting image load...");
    const img = new Image();
    img.crossOrigin = "anonymous";

    try {
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log("✅ Image loaded successfully");
          resolve(null);
        };
        img.onerror = (e) => {
          console.error("❌ Image failed to load", e);
          reject(e);
        };
        img.src = templateUrl;
      });

      console.log("✅ Setting canvas dimensions:", img.naturalWidth, "x", img.naturalHeight);
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        console.log("❌ Could not get canvas context");
        return;
      }

      ctx.drawImage(img, 0, 0);
      console.log("✅ Drew base image");

      boxes.forEach((box) => {
        const mapping = columnMappings.find((m) => m.boxId === box.id);
        if (mapping) {
          const colIndex = columns.indexOf(mapping.columnId);
          const text = firstRow[colIndex] || "";

          console.log("✅ Drawing text:", text, "at box", box.id);

          ctx.fillStyle = "#000000";
          ctx.font = `${box.height * 0.6}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(text, box.x + box.width / 2, box.y + box.height / 2);
        }
      });

      const dataUrl = canvas.toDataURL("image/png");
      console.log("✅ Generated data URL, length:", dataUrl.length);
      setPreviewImage(dataUrl);
      setShowPreview(true);
      console.log("✅✅✅ Preview generated successfully!");
    } catch (error) {
      console.error("❌ Failed to generate preview:", error);
      setPreviewImage("");
    }
  };

  useEffect(() => {
    // Auto-generate when conditions are met and preview is shown
    if (showPreview) {
      generatePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateUrl, boxes, columnMappings, columns, firstRow, showPreview]);

  const canMapPreview = boxes.length > 0 && columnMappings.length > 0;

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      
      {!showPreview || !previewImage ? (
        <div className="border-4 border-[#8B4513] rounded-lg overflow-hidden bg-[#F5E6D3] shadow-[inset_0_0_20px_rgba(139,69,19,0.2)]">
          <div className="bg-[#8B4513] text-[#F5E6D3] px-4 py-2 font-body font-bold uppercase text-sm">
            📋 Output Preview
          </div>
          <div className="p-8 text-center text-[#8B4513] font-body">
            {!canMapPreview ? (
              <p className="text-sm opacity-70 mb-4">
                Map columns to text boxes first
              </p>
            ) : (
              <>
                <p className="text-sm opacity-70 mb-4">
                  Ready to preview your certificate
                </p>
                <Button
                  onClick={() => {
                    console.log("🔘 Button clicked!");
                    generatePreview();
                  }}
                  className="bg-[#8B4513] hover:bg-[#654321] text-[#F5E6D3] border-2 border-[#654321] shadow-[3px_3px_0_#654321] hover:shadow-[4px_4px_0_#654321] transition-all font-bold font-body uppercase"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Show Preview
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="border-4 border-[#8B4513] rounded-lg bg-[#F5E6D3] shadow-[inset_0_0_20px_rgba(139,69,19,0.2)] overflow-hidden">
          <div className="bg-[#8B4513] text-[#F5E6D3] px-4 py-2 font-body font-bold uppercase text-sm flex items-center justify-between">
            <span>📋 Output Preview</span>
            <button
              onClick={() => setIsMaximized(true)}
              className="hover:bg-[#654321] p-1 rounded transition-colors"
              title="Maximize preview"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          <div
            className="p-4 cursor-pointer hover:bg-[#8B4513]/5 transition-colors"
            onClick={() => setIsMaximized(true)}
          >
            <img
              src={previewImage}
              alt="Certificate Preview"
              className="w-full h-auto rounded border-2 border-[#8B4513]/30"
            />
            <p className="text-center text-xs text-[#8B4513] mt-2 font-body opacity-70">
              Click to maximize
            </p>
          </div>
        </div>
      )}

      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent className="max-w-5xl bg-[#F5E6D3] border-4 border-[#8B4513]">
          <DialogHeader>
            <DialogTitle className="font-body text-[#8B4513] uppercase text-xl flex items-center justify-between">
              <span>📋 Certificate Preview - Sample Output</span>
              <button
                onClick={() => setIsMaximized(false)}
                className="hover:bg-[#8B4513]/10 p-2 rounded transition-colors"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <img
              src={previewImage}
              alt="Certificate Preview"
              className="w-full h-auto rounded border-2 border-[#8B4513]"
            />
            <p className="text-center text-sm text-[#8B4513] mt-4 font-body">
              This is how the certificate will look for the first row of your data
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
