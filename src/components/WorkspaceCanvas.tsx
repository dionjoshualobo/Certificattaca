import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Download, Loader2 } from "lucide-react";
import { DraggableBox, BoxPosition } from "./DraggableBox";
import { DatasetPreview, ColumnMapping } from "./DatasetPreview";
import { toast } from "sonner";
import JSZip from "jszip";

interface WorkspaceCanvasProps {
  templateUrl: string;
  columns: string[];
  rows: string[][];
}

export const WorkspaceCanvas = ({ templateUrl, columns, rows }: WorkspaceCanvasProps) => {
  const [boxes, setBoxes] = useState<BoxPosition[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [hoveredBox, setHoveredBox] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateImageSize = () => {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        setImageSize({ width: rect.width, height: rect.height });
        setScale(rect.width / imageRef.current.naturalWidth);
      }
    };

    if (imageRef.current?.complete) {
      updateImageSize();
    }

    window.addEventListener("resize", updateImageSize);
    return () => window.removeEventListener("resize", updateImageSize);
  }, [templateUrl]);

  const addBox = () => {
    const newBox: BoxPosition = {
      id: `box-${boxes.length + 1}`,
      x: 50 + boxes.length * 20,
      y: 50 + boxes.length * 20,
      width: 200,
      height: 40,
    };
    setBoxes([...boxes, newBox]);
    toast.success("Text box added");
  };

  const updateBox = (updatedBox: BoxPosition) => {
    setBoxes(boxes.map((b) => (b.id === updatedBox.id ? updatedBox : b)));
  };

  const deleteBox = (id: string) => {
    setBoxes(boxes.filter((b) => b.id !== id));
    setColumnMappings(columnMappings.filter((m) => m.boxId !== id));
    toast.success("Text box deleted");
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggingColumn && imageRef.current) {
      setMousePos({ x: e.clientX, y: e.clientY });
      
      // Check if mouse is over any box
      const rect = imageRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      const hoveredBox = boxes.find(
        (box) =>
          x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
      );

      if (hoveredBox) {
        setHoveredBox(hoveredBox.id);
        
        // Auto-attach when hovering
        const existingMapping = columnMappings.find((m) => m.columnId === draggingColumn);
        
        if (existingMapping) {
          setColumnMappings(
            columnMappings.map((m) =>
              m.columnId === draggingColumn ? { ...m, boxId: hoveredBox.id } : m
            )
          );
        } else {
          setColumnMappings([
            ...columnMappings,
            { columnId: draggingColumn, boxId: hoveredBox.id },
          ]);
        }

        setBoxes(
          boxes.map((b) =>
            b.id === hoveredBox.id ? { ...b, columnId: draggingColumn } : b
          )
        );
      } else {
        setHoveredBox(null);
      }
    }
  };

  const handleDragEnd = () => {
    if (draggingColumn && hoveredBox) {
      toast.success(`Mapped "${draggingColumn}" to box`);
    }
    setDraggingColumn(null);
    setHoveredBox(null);
  };

  const generateCertificates = async () => {
    if (boxes.length === 0) {
      toast.error("Please add at least one text box");
      return;
    }

    const unmappedBoxes = boxes.filter(
      (box) => !columnMappings.find((m) => m.boxId === box.id)
    );
    if (unmappedBoxes.length > 0) {
      toast.error("Please map all text boxes to columns");
      return;
    }

    setIsGenerating(true);
    toast.info("Generating certificates...");

    try {
      const zip = new JSZip();
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = templateUrl;
      });

      for (let i = 0; i < rows.length; i++) {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) continue;

        ctx.drawImage(img, 0, 0);

        boxes.forEach((box) => {
          const mapping = columnMappings.find((m) => m.boxId === box.id);
          if (mapping) {
            const colIndex = columns.indexOf(mapping.columnId);
            const text = rows[i][colIndex] || "";

            ctx.fillStyle = "#000000";
            ctx.font = `${box.height * 0.6}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, box.x + box.width / 2, box.y + box.height / 2);
          }
        });

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), "image/png");
        });
        
        zip.file(`certificate-${i + 1}.png`, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "certificates.zip";
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Generated ${rows.length} certificates!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate certificates");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={addBox}
          className="bg-[#8B4513] hover:bg-[#654321] text-[#F5E6D3] border-2 border-[#654321] shadow-[3px_3px_0_#654321] hover:shadow-[4px_4px_0_#654321] transition-all font-bold font-body uppercase"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Text Box
        </Button>
        <Button
          onClick={generateCertificates}
          disabled={isGenerating || boxes.length === 0}
          className="bg-[#2C1810] hover:bg-[#1a0f08] text-[#F5E6D3] border-2 border-[#654321] shadow-[3px_3px_0_#654321] hover:shadow-[4px_4px_0_#654321] transition-all font-bold font-body uppercase disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Generate Certificates
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div
            ref={containerRef}
            className="relative border-4 border-[#8B4513] rounded-lg overflow-hidden bg-[#F5E6D3] shadow-[inset_0_0_20px_rgba(139,69,19,0.2)]"
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleDragEnd}
            style={{ cursor: draggingColumn ? "crosshair" : "default" }}
          >
            <img
              ref={imageRef}
              src={templateUrl}
              alt="Certificate Template"
              className="w-full h-auto"
              onLoad={() => {
                if (imageRef.current) {
                  const rect = imageRef.current.getBoundingClientRect();
                  setImageSize({ width: rect.width, height: rect.height });
                  setScale(rect.width / imageRef.current.naturalWidth);
                }
              }}
            />
            <div className="absolute inset-0">
              {boxes.map((box) => (
                <DraggableBox
                  key={box.id}
                  box={box}
                  onUpdate={updateBox}
                  onDelete={deleteBox}
                  scale={scale}
                  isDraggingColumn={!!draggingColumn}
                  isHovered={hoveredBox === box.id}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <DatasetPreview
            columns={columns}
            rows={rows}
            onColumnDragStart={(col, pos) => {
              setDraggingColumn(col);
              setDragStartPos(pos);
              setMousePos(pos);
            }}
            onColumnDragEnd={handleDragEnd}
            columnMappings={columnMappings}
          />
        </div>
      </div>

      {draggingColumn && (
        <>
          <svg
            className="fixed inset-0 pointer-events-none z-40"
            style={{ width: "100vw", height: "100vh" }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="#8B4513"
                />
              </marker>
            </defs>
            <line
              x1={dragStartPos.x}
              y1={dragStartPos.y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#8B4513"
              strokeWidth="3"
              strokeDasharray="5,5"
              markerEnd="url(#arrowhead)"
              className="animate-pulse"
            />
          </svg>
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#8B4513] text-[#F5E6D3] px-6 py-3 border-2 border-[#654321] shadow-[0_4px_0_#654321] font-bold z-50 font-body">
            {hoveredBox ? `Attaching "${draggingColumn}"...` : `Drag to text box to map "${draggingColumn}"`}
          </div>
        </>
      )}
    </div>
  );
};
