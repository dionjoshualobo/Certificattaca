/// <reference lib="webworker" />

export interface CertificateTask {
  id: number;
  filename: string;
  texts: Array<{ text: string; x: number; y: number; height: number }>;
}

export interface WorkerInput {
  jobId: string;
  templateBlob: Blob;
  fontName: string;
  fontBuffer: ArrayBuffer | null;
  width: number;
  height: number;
  tasks: CertificateTask[];
}

export interface WorkerOutput {
  jobId: string;
  results?: Array<{ filename: string; blob: Blob }>;
  error?: string;
}

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { jobId, templateBlob, fontName, fontBuffer, width, height, tasks } = e.data;
  
  try {
    if (fontBuffer) {
      const fontFace = new FontFace(fontName, fontBuffer);
      await fontFace.load();
      (self as any).fonts.add(fontFace);
    }
    
    // Convert blob to ImageBitmap
    const bitmap = await createImageBitmap(templateBlob);
    
    const results: Array<{ filename: string; blob: Blob }> = [];
    
    // We can reuse a single OffscreenCanvas to save memory and allocation time
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error("Could not get 2D context from OffscreenCanvas");
    }
    
    for (const task of tasks) {
      // Clear canvas just in case, though drawing bitmap full-size handles it usually
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0);
      
      const textsCount = task.texts.length;
      for (let i = 0; i < textsCount; i++) {
        const t = task.texts[i];
        ctx.fillStyle = "#000000";
        ctx.font = `${t.height * 0.9}px "${fontName}", Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(t.text, t.x + t.width / 2, t.y + t.height / 2);
      }
      
      // Convert to blob (PNG)
      const blob = await canvas.convertToBlob({ type: "image/png" });
      results.push({ filename: task.filename, blob });
      
      // Let event loop breathe so termination messages can be processed natively if supported
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    self.postMessage({ jobId, results });
  } catch (err: any) {
    self.postMessage({ jobId, error: err.message || String(err) });
  }
};
