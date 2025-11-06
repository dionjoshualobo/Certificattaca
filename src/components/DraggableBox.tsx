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
  const animationFrameRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Store mouse position for smooth interpolation
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      
      if (isDragging) {
        e.preventDefault();
        const dx = (lastMousePos.current.x - startPos.current.x) / scale;
        const dy = (lastMousePos.current.y - startPos.current.y) / scale;
        
        // Store the pending update without rounding
        const newX = Math.max(0, startPos.current.boxX + dx);
        const newY = Math.max(0, startPos.current.boxY + dy);
        
        pendingUpdateRef.current = {
          x: newX,
          y: newY,
          width: box.width,
          height: box.height,
        };
        
        // Schedule update on next animation frame if not already scheduled
        if (animationFrameRef.current === null) {
          animationFrameRef.current = requestAnimationFrame(() => {
            if (pendingUpdateRef.current) {
              onUpdate({
                ...box,
                x: pendingUpdateRef.current.x,
                y: pendingUpdateRef.current.y,
                width: pendingUpdateRef.current.width,
                height: pendingUpdateRef.current.height,
              });
              pendingUpdateRef.current = null;
            }
            animationFrameRef.current = null;
          });
        }
      } else if (isResizing) {
        e.preventDefault();
        const dx = (lastMousePos.current.x - startPos.current.x) / scale;
        const dy = (lastMousePos.current.y - startPos.current.y) / scale;
        
        let newWidth = startPos.current.width;
        let newHeight = startPos.current.height;
        let newX = startPos.current.boxX;
        let newY = startPos.current.boxY;

        if (isResizing.includes("e")) newWidth = Math.max(50, startPos.current.width + dx);
        if (isResizing.includes("w")) {
          const deltaWidth = Math.min(dx, startPos.current.width - 50);
          newWidth = startPos.current.width - deltaWidth;
          newX = startPos.current.boxX + deltaWidth;
        }
        if (isResizing.includes("s")) newHeight = Math.max(30, startPos.current.height + dy);
        if (isResizing.includes("n")) {
          const deltaHeight = Math.min(dy, startPos.current.height - 30);
          newHeight = startPos.current.height - deltaHeight;
          newY = startPos.current.boxY + deltaHeight;
        }

        // Ensure boxes stay within bounds
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);

        // Store pending update without rounding
        pendingUpdateRef.current = {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        };
        
        // Schedule update on next animation frame if not already scheduled
        if (animationFrameRef.current === null) {
          animationFrameRef.current = requestAnimationFrame(() => {
            if (pendingUpdateRef.current) {
              onUpdate({
                ...box,
                x: pendingUpdateRef.current.x,
                y: pendingUpdateRef.current.y,
                width: pendingUpdateRef.current.width,
                height: pendingUpdateRef.current.height,
              });
              pendingUpdateRef.current = null;
            }
            animationFrameRef.current = null;
          });
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      
      // Cancel any pending animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Apply any pending update immediately
      if (pendingUpdateRef.current) {
        onUpdate({
          ...box,
          x: pendingUpdateRef.current.x,
          y: pendingUpdateRef.current.y,
          width: pendingUpdateRef.current.width,
          height: pendingUpdateRef.current.height,
        });
        pendingUpdateRef.current = null;
      }
      
      setIsDragging(false);
      setIsResizing(null);
      document.body.style.userSelect = ''; // Re-enable text selection
      document.body.style.cursor = ''; // Reset cursor
    };

    if (isDragging || isResizing) {
      // Disable text selection and set cursor during drag
      document.body.style.userSelect = 'none';
      document.body.style.cursor = isDragging ? 'move' : 'resize';
      
      document.addEventListener("mousemove", handleMouseMove, { passive: false });
      document.addEventListener("mouseup", handleMouseUp, { passive: false });
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
      // Clean up animation frame on unmount
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isDragging, isResizing, box, onUpdate, scale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDraggingColumn) return; // Disable during column drag
    e.preventDefault();
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
    e.preventDefault();
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
      className={`absolute border-2 group transition-none ${
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
        willChange: isDragging || isResizing ? 'transform' : 'auto',
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
            className="absolute -top-2 -left-2 w-4 h-4 bg-[#8B4513] rounded-full cursor-nw-resize border-2 border-[#654321] hover:bg-[#654321] transition-colors opacity-0 group-hover:opacity-100"
            onMouseDown={handleResizeStart("nw")}
          />
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#8B4513] rounded-full cursor-n-resize border-2 border-[#654321] hover:bg-[#654321] transition-colors opacity-0 group-hover:opacity-100"
            onMouseDown={handleResizeStart("n")}
          />
          <div
            className="absolute -top-2 -right-2 w-4 h-4 bg-[#8B4513] rounded-full cursor-ne-resize border-2 border-[#654321] hover:bg-[#654321] transition-colors opacity-0 group-hover:opacity-100"
            onMouseDown={handleResizeStart("ne")}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-4 bg-[#8B4513] rounded-full cursor-e-resize border-2 border-[#654321] hover:bg-[#654321] transition-colors opacity-0 group-hover:opacity-100"
            onMouseDown={handleResizeStart("e")}
          />
          <div
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-[#8B4513] rounded-full cursor-se-resize border-2 border-[#654321] hover:bg-[#654321] transition-colors opacity-0 group-hover:opacity-100"
            onMouseDown={handleResizeStart("se")}
          />
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#8B4513] rounded-full cursor-s-resize border-2 border-[#654321] hover:bg-[#654321] transition-colors opacity-0 group-hover:opacity-100"
            onMouseDown={handleResizeStart("s")}
          />
          <div
            className="absolute -bottom-2 -left-2 w-4 h-4 bg-[#8B4513] rounded-full cursor-sw-resize border-2 border-[#654321] hover:bg-[#654321] transition-colors opacity-0 group-hover:opacity-100"
            onMouseDown={handleResizeStart("sw")}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-4 bg-[#8B4513] rounded-full cursor-w-resize border-2 border-[#654321] hover:bg-[#654321] transition-colors opacity-0 group-hover:opacity-100"
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
