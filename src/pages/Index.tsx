import { useState } from "react";
import { UploadSection } from "@/components/UploadSection";
import { WorkspaceCanvas } from "@/components/WorkspaceCanvas";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const Index = () => {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string>("");
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);

  const handleTemplateUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    setTemplateFile(file);
    const url = URL.createObjectURL(file);
    setTemplateUrl(url);
    toast.success("Template uploaded successfully!");
  };

  const handleDatasetUpload = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    try {
      if (extension === "csv" || extension === "tsv") {
        const delimiter = extension === "tsv" ? "\t" : ",";
        const text = await file.text();
        
        Papa.parse(text, {
          delimiter,
          complete: (results) => {
            if (results.data.length > 0) {
              const data = results.data as string[][];
              setColumns(data[0]);
              setRows(data.slice(1).filter((row) => row.some((cell) => cell.trim())));
              toast.success("Dataset uploaded successfully!");
            }
          },
          error: () => {
            toast.error("Failed to parse dataset");
          },
        });
      } else if (extension === "xlsx" || extension === "xls") {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        if (data.length > 0) {
          setColumns(data[0]);
          setRows(data.slice(1).filter((row) => row.some((cell) => cell?.toString().trim())));
          toast.success("Dataset uploaded successfully!");
        }
      } else {
        toast.error("Unsupported file format");
        return;
      }

      setDatasetFile(file);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load dataset");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5E6D3] relative" style={{ 
      backgroundImage: `
        repeating-linear-gradient(0deg, rgba(139, 69, 19, 0.03) 0px, rgba(139, 69, 19, 0.03) 1px, transparent 1px, transparent 2px),
        repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.03) 0px, rgba(139, 69, 19, 0.03) 1px, transparent 1px, transparent 2px)
      `
    }}>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVFNkQzIi8+PHBhdGggZD0iTTAgMGgyMDB2MjAwSDB6IiBmaWxsPSJub25lIiBzdHJva2U9IiM4QjQ1MTMiIHN0cm9rZS13aWR0aD0iMC4xIiBvcGFjaXR5PSIwLjA1Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')] opacity-30" />
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-4 border-b-4 border-double border-[#8B4513]">
          <div className="border-4 border-[#8B4513] bg-[#2C1810] px-6 py-4 shadow-[6px_6px_0_#654321]">
            <h1 className="text-4xl font-bold text-[#F5E6D3] mb-2 font-headline uppercase tracking-wider drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)]">
              ✦ CERTIFICATE PRESS ✦
            </h1>
            <p className="text-[#DCC9B3] font-body italic text-center border-t-2 border-[#654321] pt-2">
              Est. 1885 — Premium Document Generation
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Upload Section */}
        {(!templateUrl || !datasetFile) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <UploadSection
              title="Certificate Template"
              description="Upload your certificate image"
              acceptedFormats=".jpg,.jpeg,.png,.webp"
              onFileUpload={handleTemplateUpload}
              uploadedFileName={templateFile?.name}
              icon="image"
            />
            <UploadSection
              title="Dataset"
              description="Upload your data file"
              acceptedFormats=".csv,.tsv,.xlsx,.xls"
              onFileUpload={handleDatasetUpload}
              uploadedFileName={datasetFile?.name}
              icon="data"
            />
          </div>
        )}

        {/* Workspace */}
        {templateUrl && datasetFile && columns.length > 0 && (
          <WorkspaceCanvas templateUrl={templateUrl} columns={columns} rows={rows} />
        )}

        {/* Instructions */}
        {(!templateUrl || !datasetFile) && (
          <div className="mt-8 p-6 border-4 border-[#8B4513] bg-[#F5E6D3] shadow-[6px_6px_0_#654321]">
            <div className="border-b-4 border-double border-[#8B4513] pb-3 mb-4">
              <h2 className="text-2xl font-bold text-[#2C1810] font-headline uppercase tracking-wide text-center">✦ Instructions ✦</h2>
            </div>
            <ol className="space-y-3 text-[#4A3728] font-body">
              <li className="flex gap-3 items-start border-l-4 border-[#8B4513] pl-3">
                <span className="text-[#8B4513] font-bold text-lg font-headline">I.</span>
                <span>Upload a certificate template image</span>
              </li>
              <li className="flex gap-3 items-start border-l-4 border-[#8B4513] pl-3">
                <span className="text-[#8B4513] font-bold text-lg font-headline">II.</span>
                <span>Upload a dataset (CSV, TSV, or Excel)</span>
              </li>
              <li className="flex gap-3 items-start border-l-4 border-[#8B4513] pl-3">
                <span className="text-[#8B4513] font-bold text-lg font-headline">III.</span>
                <span>Add text boxes and position them on your template</span>
              </li>
              <li className="flex gap-3 items-start border-l-4 border-[#8B4513] pl-3">
                <span className="text-[#8B4513] font-bold text-lg font-headline">IV.</span>
                <span>Drag arrows from column headers to text boxes</span>
              </li>
              <li className="flex gap-3 items-start border-l-4 border-[#8B4513] pl-3">
                <span className="text-[#8B4513] font-bold text-lg font-headline">V.</span>
                <span>Click "Generate Certificates" to create a ZIP file</span>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
