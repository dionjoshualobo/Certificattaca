import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BoxPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columnId?: string;
}

interface DraggableBoxProps {
  box: BoxPosition;
  onUpdate: (box: BoxPosition) => void;
  onDelete: (id: string) => void;
  scale: number;
  isDraggingColumn?: boolean;
  isHovered?: boolean;
}

export const DraggableBox = ({ box, onUpdate, onDelete, scale, isDraggingColumn, isHovered }: DraggableBoxProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0, boxX: 0, boxY: 0, width: 0, height: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = (e.clientX - startPos.current.x) / scale;
        const dy = (e.clientY - startPos.current.y) / scale;
        onUpdate({
          ...box,
          x: startPos.current.boxX + dx,
          y: startPos.current.boxY + dy,
        });
      } else if (isResizing) {
        const dx = (e.clientX - startPos.current.x) / scale;
        const dy = (e.clientY - startPos.current.y) / scale;
        
        let newWidth = startPos.current.width;
        let newHeight = startPos.current.height;
        let newX = box.x;
        let newY = box.y;

        if (isResizing.includes("e")) newWidth = Math.max(50, startPos.current.width + dx);
        if (isResizing.includes("w")) {
          newWidth = Math.max(50, startPos.current.width - dx);
          newX = startPos.current.boxX + dx;
        }
        if (isResizing.includes("s")) newHeight = Math.max(30, startPos.current.height + dy);
        if (isResizing.includes("n")) {
          newHeight = Math.max(30, startPos.current.height - dy);
          newY = startPos.current.boxY + dy;
        }

        onUpdate({ ...box, x: newX, y: newY, width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, box, onUpdate, scale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDraggingColumn) return; // Disable during column drag
    e.stopPropagation();
    setIsDragging(true);
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      boxX: box.x,
      boxY: box.y,
      width: box.width,
      height: box.height,
    };
  };

  const handleResizeStart = (direction: string) => (e: React.MouseEvent) => {
    if (isDraggingColumn) return; // Disable during column drag
    e.stopPropagation();
    setIsResizing(direction);
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      boxX: box.x,
      boxY: box.y,
      width: box.width,
      height: box.height,
    };
  };

  return (
    <div
      ref={boxRef}
      className={`absolute border-2 group transition-all ${
        isDraggingColumn 
          ? isHovered
            ? 'border-[#8B4513] bg-[#8B4513]/40 shadow-[0_0_20px_rgba(139,69,19,0.8)] animate-pulse cursor-crosshair'
            : 'border-[#8B4513] bg-[#8B4513]/20 shadow-[0_0_15px_rgba(139,69,19,0.5)] cursor-crosshair'
          : 'border-[#8B4513] bg-[#F5E6D3]/50 cursor-move'
      }`}
      style={{
        left: `${box.x}px`,
        top: `${box.y}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {!isDraggingColumn && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute -top-3 -right-3 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-[#8B4513] hover:bg-[#654321] border-2 border-[#654321]"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(box.id);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {/* Resize handles - only show when not dragging column */}
      {!isDraggingColumn && (
        <>
          <div
            className="absolute -top-1 -left-1 w-3 h-3 bg-[#8B4513] rounded-full cursor-nw-resize border border-[#654321]"
            onMouseDown={handleResizeStart("nw")}
          />
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#8B4513] rounded-full cursor-n-resize border border-[#654321]"
            onMouseDown={handleResizeStart("n")}
          />
          <div
            className="absolute -top-1 -right-1 w-3 h-3 bg-[#8B4513] rounded-full cursor-ne-resize border border-[#654321]"
            onMouseDown={handleResizeStart("ne")}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-3 bg-[#8B4513] rounded-full cursor-e-resize border border-[#654321]"
            onMouseDown={handleResizeStart("e")}
          />
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#8B4513] rounded-full cursor-se-resize border border-[#654321]"
            onMouseDown={handleResizeStart("se")}
          />
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#8B4513] rounded-full cursor-s-resize border border-[#654321]"
            onMouseDown={handleResizeStart("s")}
          />
          <div
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-[#8B4513] rounded-full cursor-sw-resize border border-[#654321]"
            onMouseDown={handleResizeStart("sw")}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-3 bg-[#8B4513] rounded-full cursor-w-resize border border-[#654321]"
            onMouseDown={handleResizeStart("w")}
          />
        </>
      )}
      
      {isDraggingColumn && isHovered && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 rounded-full bg-[#8B4513] animate-ping" />
          <div className="absolute w-3 h-3 rounded-full bg-[#8B4513] border-2 border-[#F5E6D3]" />
        </div>
      )}
      
      {box.columnId && !isDraggingColumn && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-[#8B4513] pointer-events-none font-bold bg-[#F5E6D3]/70">
          {box.columnId}
        </div>
      )}
    </div>
  );
};
