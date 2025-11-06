import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Download, Loader2 } from "lucide-react";
import { DraggableBox, BoxPosition } from "./DraggableBox";
import { DatasetPreview, ColumnMapping } from "./DatasetPreview";
import { toast } from "sonner";
import JSZip from "jszip";

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
  
  // Create a fun curved path with multiple control points
  const curvature = Math.min(distance / 3, 100);
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  const controlX1 = start.x + dx * 0.3 + perpX * curvature * 0.8;
  const controlY1 = start.y + dy * 0.3 + perpY * curvature * 0.8;
  
  const controlX2 = start.x + dx * 0.7 - perpX * curvature * 0.8;
  const controlY2 = start.y + dy * 0.7 - perpY * curvature * 0.8;
  
  const pathData = `M ${start.x} ${start.y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${end.x} ${end.y}`;
  
  const markerId = `arrowhead-${isActive ? 'active' : 'normal'}-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <svg 
      className={isActive ? "fixed inset-0 pointer-events-none" : "absolute inset-0 pointer-events-none"}
      style={{
        zIndex: isActive ? 40 : 5,
        overflow: 'visible',
        width: '100vw',
        height: '100vh'
      }}
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="12"
          markerHeight="8"
          refX="10"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 12 4, 0 8"
            fill={isActive ? "#FF6B6B" : color}
          />
        </marker>
      </defs>
      <path
        d={pathData}
        stroke={isActive ? "#FF6B6B" : color}
        strokeWidth={isActive ? "4" : "3"}
        fill="none"
        strokeDasharray={isActive ? "8,4" : "none"}
        markerEnd={`url(#${markerId})`}
        className={isActive ? "animate-pulse" : ""}
        strokeLinecap="round"
      />
    </svg>
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
          
          // When hovering over a box, snap the visual endpoint to the box center
          const boxCenterX = rect.left + (currentHoveredBox.x + currentHoveredBox.width / 2) * scale;
          const boxCenterY = rect.top + (currentHoveredBox.y + currentHoveredBox.height / 2) * scale;
          
          setMousePos({ 
            x: boxCenterX, 
            y: boxCenterY 
          });
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
      
      // When hovering over a box, snap the visual endpoint to the box center
      const boxCenterX = rect.left + (currentHoveredBox.x + currentHoveredBox.width / 2) * scale;
      const boxCenterY = rect.top + (currentHoveredBox.y + currentHoveredBox.height / 2) * scale;
      
      setMousePos({ 
        x: boxCenterX, 
        y: boxCenterY 
      });
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
          // Calculate start position (from dataset preview)
          const datasetElement = document.querySelector(`[data-column="${mapping.columnId}"]`);
          if (datasetElement) {
            const datasetRect = datasetElement.getBoundingClientRect();
            const imageRect = imageRef.current.getBoundingClientRect();
            
            // Get the grid container rect for proper positioning
            const gridContainer = containerRef.current?.closest('.grid');
            const gridRect = gridContainer ? gridContainer.getBoundingClientRect() : { left: 0, top: 0 };
            
            const start = {
              x: datasetRect.left + datasetRect.width / 2 - gridRect.left,
              y: datasetRect.bottom - gridRect.top
            };

            // Calculate end position (center of the box)
            const end = {
              x: imageRect.left - gridRect.left + (box.x + box.width / 2) * scale,
              y: imageRect.top - gridRect.top + (box.y + box.height / 2) * scale
            };

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

        <div>
          <DatasetPreview
            columns={columns}
            rows={rows}
            onColumnDragStart={handleColumnDragStart}
            onColumnDragEnd={handleDragEnd}
            columnMappings={columnMappings}
          />
        </div>

        {/* Render connection lines */}
        {!isDragging && getConnectionLines().map((connection, index) => (
          <CurvedArrow
            key={`${connection.columnId}-${connection.boxId}`}
            start={connection.start}
            end={connection.end}
            color="#8B4513"
          />
        ))}
      </div>

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
    </div>
  );
};
