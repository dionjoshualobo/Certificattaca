import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Download, Loader2 } from "lucide-react";
import { DraggableBox, BoxPosition } from "./DraggableBox";
import { DatasetPreview, ColumnMapping } from "./DatasetPreview";
import { CertificatePreview } from "./CertificatePreview";
import { toast } from "sonner";
import JSZip from "jszip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// SVG component for curved arrows
const CurvedArrow = ({ 
  start, 
  end, 
  isActive = false, 
  color = "#8B4513" 
}: { 
  start: { x: number; y: number }; 
  end: { x: number; y: number }; 
  isActive?: boolean;
  color?: string;
}) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Create a curved path
  const curvature = Math.min(distance / 3, 100);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  
  // Control point for the curve (offset perpendicular to the line)
  const controlX = midX + (dy / distance) * curvature;
  const controlY = midY - (dx / distance) * curvature;
  
  const pathData = `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
  const markerId = `arrow-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <g>
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill={color}
          />
        </marker>
      </defs>
      <path
        d={pathData}
        stroke={color}
        strokeWidth="3"
        fill="none"
        markerEnd={`url(#${markerId})`}
        strokeLinecap="round"
      />
    </g>
  );
};

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
  const [isDragging, setIsDragging] = useState(false);
  const [showNamingDialog, setShowNamingDialog] = useState(false);
  const [namingOption, setNamingOption] = useState<string>("default");
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  // Helper function to get the center of a box from the DOM
  const getBoxCenter = (boxId: string) => {
    const boxElement = document.querySelector(`[data-box-id="${boxId}"]`);
    if (boxElement && imageRef.current) {
      const boxRect = boxElement.getBoundingClientRect();
      return {
        x: boxRect.left + boxRect.width / 2,
        y: boxRect.top + boxRect.height / 2
      };
    }
    return null;
  };

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

  // Global mouse move listener for drag tracking
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggingColumn && imageRef.current) {
        // Check if mouse is over any box
        const rect = imageRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        const currentHoveredBox = boxes.find(
          (box) =>
            x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
        );

        if (currentHoveredBox) {
          setHoveredBox(currentHoveredBox.id);
          
          // Get the actual center position from the DOM element (where the red dot is)
          const center = getBoxCenter(currentHoveredBox.id);
          if (center) {
            setMousePos(center);
          }
        } else {
          setHoveredBox(null);
          // When not hovering over a box, follow the actual mouse position
          setMousePos({
            x: e.clientX,
            y: e.clientY
          });
        }
      }
    };

    if (draggingColumn) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      return () => document.removeEventListener('mousemove', handleGlobalMouseMove);
    }
  }, [draggingColumn, boxes, scale]);

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
    // Only handle mouse move if we're dragging a column
    if (!draggingColumn || !imageRef.current) return;
    
    // Check if mouse is over any box
    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const currentHoveredBox = boxes.find(
      (box) =>
        x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
    );

    if (currentHoveredBox) {
      setHoveredBox(currentHoveredBox.id);
      
      // Get the actual center position from the DOM element (where the red dot is)
      const center = getBoxCenter(currentHoveredBox.id);
      if (center) {
        setMousePos(center);
      }
    } else {
      setHoveredBox(null);
      // When not hovering over a box, follow the actual mouse position
      setMousePos({ 
        x: e.clientX, 
        y: e.clientY 
      });
    }
  };

  const handleColumnDragStart = (columnId: string, startPos: { x: number; y: number }) => {
    setDraggingColumn(columnId);
    setDragStartPos(startPos);
    setIsDragging(true);
    setMousePos(startPos);
  };

  const handleDragEnd = () => {
    if (draggingColumn && hoveredBox) {
      // Find if this column is already mapped to another box
      const existingMapping = columnMappings.find((m) => m.columnId === draggingColumn);
      
      if (existingMapping) {
        // Update existing mapping
        setColumnMappings(
          columnMappings.map((m) =>
            m.columnId === draggingColumn ? { ...m, boxId: hoveredBox } : m
          )
        );
      } else {
        // Create new mapping
        setColumnMappings([
          ...columnMappings,
          { columnId: draggingColumn, boxId: hoveredBox },
        ]);
      }

      // Update the box to show which column it's mapped to
      setBoxes(
        boxes.map((b) =>
          b.id === hoveredBox ? { ...b, columnId: draggingColumn } : b
        )
      );

      toast.success(`Mapped "${draggingColumn}" to ${hoveredBox}`);
    }
    
    setDraggingColumn(null);
    setHoveredBox(null);
    setIsDragging(false);
  };

  const getConnectionLines = () => {
    const connections: Array<{
      start: { x: number; y: number };
      end: { x: number; y: number };
      columnId: string;
      boxId: string;
    }> = [];

    columnMappings.forEach((mapping) => {
      if (mapping.boxId) {
        const box = boxes.find(b => b.id === mapping.boxId);
        if (box && imageRef.current) {
          // Calculate start position (from dataset preview column header)
          const datasetElement = document.querySelector(`[data-column="${mapping.columnId}"]`);
          if (datasetElement) {
            const datasetRect = datasetElement.getBoundingClientRect();
            const imageRect = imageRef.current.getBoundingClientRect();
            
            // Start position: center-bottom of the column header arrow icon
            const start = {
              x: datasetRect.left + datasetRect.width / 2,
              y: datasetRect.bottom
            };

            // End position: get the actual center from the DOM (same as red dot)
            const center = getBoxCenter(box.id);
            const end = center || {
              x: imageRect.left + (box.x * scale) + (box.width * scale / 2),
              y: imageRect.top + (box.y * scale) + (box.height * scale / 2)
            };

            // Debug logging with clearer format
            console.log('🎯 Connection Debug:', {
              mapping: `${mapping.columnId} → ${mapping.boxId}`,
              start: `(${start.x.toFixed(0)}, ${start.y.toFixed(0)})`,
              end: `(${end.x.toFixed(0)}, ${end.y.toFixed(0)})`,
              distance: `${Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2).toFixed(0)}px`,
              box: `${box.x}×${box.y} (${box.width}×${box.height})`,
              scale: scale.toFixed(2),
              imagePos: `${imageRect.left.toFixed(0)}, ${imageRect.top.toFixed(0)}`,
              datasetPos: `${datasetRect.left.toFixed(0)}, ${datasetRect.bottom.toFixed(0)}`
            });

            connections.push({ start, end, columnId: mapping.columnId, boxId: mapping.boxId });
          }
        }
      }
    });

    return connections;
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

    // Show naming dialog before generating
    setShowNamingDialog(true);
  };

  // Helper function to sanitize filename
  const sanitizeFilename = (filename: string): string => {
    const sanitized = filename
      .replace(/[^a-zA-Z0-9-_ ]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 200); // Limit length
    
    // Return empty string if nothing valid remains
    return sanitized.trim();
  };

  const proceedWithGeneration = async () => {
    setShowNamingDialog(false);
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

      const usedFilenames = new Set<string>();
      
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
        
        // Generate filename based on naming option
        let filename: string;
        if (namingOption === "default") {
          filename = `certificate-${i + 1}.png`;
        } else {
          // Use the selected column's value for naming
          const colIndex = columns.indexOf(namingOption);
          if (colIndex === -1) {
            // Column not found, fallback to default
            filename = `certificate-${i + 1}.png`;
          } else {
            const nameValue = rows[i][colIndex] || `certificate-${i + 1}`;
            const sanitized = sanitizeFilename(nameValue);
            let baseName = sanitized || `certificate-${i + 1}`;
            
            // Handle duplicate filenames by adding a counter
            let finalName = `${baseName}.png`;
            let counter = 1;
            while (usedFilenames.has(finalName)) {
              finalName = `${baseName}-${counter}.png`;
              counter++;
            }
            filename = finalName;
            usedFilenames.add(filename);
          }
        }
        
        zip.file(filename, blob);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative">
        <div className="lg:col-span-2">
          <div
            ref={containerRef}
            className="relative border-4 border-[#8B4513] rounded-lg overflow-hidden bg-[#F5E6D3] shadow-[inset_0_0_20px_rgba(139,69,19,0.2)]"
            onMouseMove={draggingColumn ? handleCanvasMouseMove : undefined}
            onMouseUp={draggingColumn ? handleDragEnd : undefined}
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

        <div className="space-y-4">
          <DatasetPreview
            columns={columns}
            rows={rows}
            onColumnDragStart={handleColumnDragStart}
            onColumnDragEnd={handleDragEnd}
            columnMappings={columnMappings}
          />
          
          <CertificatePreview
            templateUrl={templateUrl}
            boxes={boxes}
            columnMappings={columnMappings}
            columns={columns}
            firstRow={rows[0] || []}
          />
        </div>
      </div>

      {/* Render connection lines with clean arrows pointing to red dots */}
      {!isDragging && columnMappings.length > 0 && (
        <svg 
          className="fixed inset-0 pointer-events-none"
          style={{ 
            zIndex: 5, 
            width: '100vw', 
            height: '100vh',
            overflow: 'visible'
          }}
        >
          {getConnectionLines().map((connection, index) => (
            <CurvedArrow
              key={`connection-${connection.columnId}-${connection.boxId}`}
              start={connection.start}
              end={connection.end}
              color="#8B4513"
            />
          ))}
        </svg>
      )}

      {/* Active drag line with fun curves */}
      {draggingColumn && (
        <>
          <svg
            className="fixed inset-0 pointer-events-none z-40"
            style={{ width: "100vw", height: "100vh" }}
          >
            <defs>
              <marker
                id="drag-arrowhead"
                markerWidth="12"
                markerHeight="8"
                refX="10"
                refY="4"
                orient="auto"
              >
                <polygon
                  points="0 0, 12 4, 0 8"
                  fill={hoveredBox ? "#4ADE80" : "#FF6B6B"}
                />
              </marker>
            </defs>
            <path
              d={`M ${dragStartPos.x} ${dragStartPos.y} Q ${(dragStartPos.x + mousePos.x) / 2} ${dragStartPos.y - 50} ${mousePos.x} ${mousePos.y}`}
              stroke={hoveredBox ? "#4ADE80" : "#FF6B6B"}
              strokeWidth={hoveredBox ? "5" : "4"}
              fill="none"
              strokeDasharray={hoveredBox ? "none" : "8,4"}
              markerEnd="url(#drag-arrowhead)"
              className={hoveredBox ? "animate-bounce" : "animate-pulse"}
              strokeLinecap="round"
            />
            {/* Add a glow effect and target circle when hovering over a box */}
            {hoveredBox && (
              <>
                <path
                  d={`M ${dragStartPos.x} ${dragStartPos.y} Q ${(dragStartPos.x + mousePos.x) / 2} ${dragStartPos.y - 50} ${mousePos.x} ${mousePos.y}`}
                  stroke="#4ADE80"
                  strokeWidth="8"
                  fill="none"
                  opacity="0.3"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
                <circle
                  cx={mousePos.x}
                  cy={mousePos.y}
                  r="8"
                  fill="#4ADE80"
                  stroke="#065F46"
                  strokeWidth="2"
                  className="animate-ping"
                />
                <circle
                  cx={mousePos.x}
                  cy={mousePos.y}
                  r="4"
                  fill="#4ADE80"
                  stroke="#065F46"
                  strokeWidth="1"
                />
              </>
            )}
          </svg>
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#8B4513] text-[#F5E6D3] px-6 py-3 border-2 border-[#654321] shadow-[0_4px_0_#654321] font-bold z-50 font-body uppercase tracking-wide">
            {hoveredBox ? `🎯 Ready to connect "${draggingColumn}" to ${hoveredBox}!` : `🎨 Drag "${draggingColumn}" to any text box`}
          </div>
        </>
      )}

      {/* Certificate Naming Dialog */}
      <Dialog open={showNamingDialog} onOpenChange={setShowNamingDialog}>
        <DialogContent className="bg-[#F5E6D3] border-4 border-[#8B4513]">
          <DialogHeader>
            <DialogTitle className="font-body text-[#8B4513] uppercase text-xl">
              ✦ Certificate Naming ✦
            </DialogTitle>
            <DialogDescription className="text-[#4A3728] font-body">
              Choose how you want to name your certificates
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={namingOption} onValueChange={setNamingOption}>
              <SelectTrigger className="border-2 border-[#8B4513] bg-[#F5E6D3] text-[#2C1810] font-body">
                <SelectValue placeholder="Select naming option" />
              </SelectTrigger>
              <SelectContent className="bg-[#F5E6D3] border-2 border-[#8B4513]">
                <SelectItem value="default" className="font-body text-[#2C1810]">
                  Default (certificate-1, certificate-2...)
                </SelectItem>
                {columns.map((column) => (
                  <SelectItem key={column} value={column} className="font-body text-[#2C1810]">
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNamingDialog(false)}
              className="border-2 border-[#8B4513] text-[#8B4513] hover:bg-[#8B4513]/10 font-body uppercase"
            >
              Cancel
            </Button>
            <Button
              onClick={proceedWithGeneration}
              className="bg-[#8B4513] hover:bg-[#654321] text-[#F5E6D3] border-2 border-[#654321] shadow-[3px_3px_0_#654321] hover:shadow-[4px_4px_0_#654321] transition-all font-bold font-body uppercase"
            >
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
