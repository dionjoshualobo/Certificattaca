import { Card } from "@/components/ui/card";
import { ArrowDown } from "lucide-react";
import { useState, useRef } from "react";

export interface ColumnMapping {
  columnId: string;
  boxId: string | null;
}

interface DatasetPreviewProps {
  columns: string[];
  rows: string[][];
  onColumnDragStart: (columnId: string, startPos: { x: number; y: number }) => void;
  onColumnDragEnd: () => void;
  columnMappings: ColumnMapping[];
}

export const DatasetPreview = ({
  columns,
  rows,
  onColumnDragStart,
  onColumnDragEnd,
  columnMappings,
}: DatasetPreviewProps) => {
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleDragStart = (columnId: string) => (e: React.MouseEvent) => {
    setDraggedColumn(columnId);
    const rect = e.currentTarget.getBoundingClientRect();
    const startPos = { 
      x: rect.left + rect.width / 2, 
      y: rect.bottom 
    };
    dragStartPos.current = startPos;
    onColumnDragStart(columnId, startPos);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    onColumnDragEnd();
  };

  const getBoxIdForColumn = (columnId: string) => {
    return columnMappings.find((m) => m.columnId === columnId)?.boxId;
  };

  return (
    <Card className="p-4 border-4 border-[#8B4513] bg-[#F5E6D3] shadow-[4px_4px_0_#654321] max-h-60 overflow-auto">
      <div className="mb-3 pb-2 border-b-2 border-[#8B4513]">
        <h3 className="text-base font-bold text-[#2C1810] mb-1 font-headline uppercase tracking-wide">Dataset Preview</h3>
        <p className="text-xs text-[#654321] font-body italic">
          ✦ Drag arrows from column headers to text boxes ✦
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-4 border-double border-[#8B4513]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-3 py-2 text-left font-bold bg-[#DCC9B3] relative border-r-2 border-[#8B4513] last:border-r-0"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="cursor-grab active:cursor-grabbing p-1 hover:bg-[#8B4513]/20 rounded transition-colors"
                      onMouseDown={handleDragStart(col)}
                      onMouseUp={handleDragEnd}
                    >
                      <ArrowDown className="h-4 w-4 text-[#8B4513] animate-pulse" />
                    </div>
                    <span className="text-[#2C1810] font-body font-bold uppercase tracking-wide">{col}</span>
                    {getBoxIdForColumn(col) && (
                      <span className="text-xs text-[#8B4513] font-mono bg-[#F5E6D3] px-1 border border-[#8B4513]">
                        → {getBoxIdForColumn(col)}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-[#C9B8A3] hover:bg-[#E8DCC8] transition-colors">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-3 py-2 text-[#4A3728] font-body border-r border-[#C9B8A3] last:border-r-0">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 5 && (
        <p className="text-xs text-[#654321] mt-3 pt-2 border-t-2 border-[#8B4513] font-body italic text-center">
          ✦ {rows.length - 5} more rows ✦
        </p>
      )}
    </Card>
  );
};
