export interface Extractor {
  id: string;
  name: string;
  icon: string;
  description?: string;
  prompt?: string;
}

export interface ExtractedResult {
  id: string;
  fileName: string;
  content: string;
  extractedAt: Date;
  originalContent?: string;
  fileType?: string;
  jobId?: string;
}
