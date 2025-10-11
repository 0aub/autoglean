export interface Extractor {
  id: number | string;  // Database primary key
  extractor_id: string;  // UUID for extraction operations
  name_en: string;
  name_ar: string;
  icon: string;
  description_en?: string;
  description_ar?: string;
  prompt?: string;
  owner_id: number;
  owner_name_en: string;
  owner_name_ar: string;
  owner_department_name_en?: string;
  owner_department_name_ar?: string;
  owner_gm_name_en?: string;
  owner_gm_name_ar?: string;
  visibility: 'public' | 'private' | 'shared';
  llm: string;
  temperature: number;
  max_tokens: number;
  output_format: string;
  usage_count: number;
  rating_avg: number | null;
  rating_count: number;
  is_favorited: boolean;
  created_at: string;
  updated_at: string;
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
