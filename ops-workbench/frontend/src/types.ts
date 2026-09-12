export type View = "flow" | "materials" | "copy" | "music" | "production";
export type PlatformModule = "video" | "aiVideo";

export type User = {
  id: string;
  username: string;
  display_name: string;
  phone: string;
  is_active: boolean;
};

export type ModelProfile = {
  stage: string;
  label: string;
  provider_type: string;
  protocol: string;
  capabilities: string[];
  base_url: string;
  model: string;
  temperature: number;
  proxy_url: string;
  api_key: string;
  has_api_key: boolean;
  api_key_mask: string;
};

export type ModelProfilesResponse = {
  profiles: ModelProfile[];
};

export type Product = {
  id: number;
  system_code: string;
  name: string;
  status: string;
  asset_count: number;
};

export type SourceVideo = { name: string; relative_path: string; path: string };

export type Tag = { id: string; name: string; category: string; category_id: string; product_id?: number };
export type TagCategory = { id: string; name: string };
export type ClassifiedMaterial = {
  id: string;
  product_id: number;
  product_name: string;
  filename: string;
  source_path: string;
  status: string;
  duration_seconds: number;
  width: number;
  height: number;
  tags: Tag[];
};

export type CopyItem = {
  id: string;
  content: string;
  product_id: number | null;
  product_name?: string;
  source: string;
};
export type CopyCandidate = { id: string; content: string; status: string; rejection_reason?: string; library_content_id?: string | null };
export type CopyBatch = { id: string; sequence_number: number; created_at: string; copies: CopyCandidate[] };
export type CopyAnalysis = {
  id: string;
  source_mode: "input" | "adopted_history";
  source_text: string;
  language_analysis: Record<string, string>;
  audience_analysis: Record<string, string>;
  expert_role: string;
  created_at: string;
  batches: CopyBatch[];
};
export type VoiceCatalogItem = {
  sequence: number;
  name: string;
  voice: string;
  gender: string;
  age: string;
  trait: string;
  scenario: string;
  language: string;
  preview_filename: string;
  preview_ready?: boolean;
};
export type Narration = {
  id: string;
  approved_text: string;
  recognized_text: string;
  voice_source: "human" | "model";
  text_source: "human" | "model";
  subtitle_cues: Array<Record<string, unknown>>;
  status: string;
};
export type MusicResource = {
  id: string;
  name: string;
  status: string;
  duration_seconds: number;
  source_type: string;
  custom_tags: string[];
  error?: string;
};
export type JianyingDraft = {
  id: string;
  name: string;
  draft_path: string;
  status: string;
  created_at: string;
  error: string;
  copy_content_id?: string | null;
  narration_asset_id?: string | null;
  music_resource_id?: string | null;
  snapshot?: Record<string, unknown>;
};
export type DraftDirectory = { path: string; windows_path: string; source: string; exists: boolean };

export type DeleteConfirmation = {
  title: string;
  message: string;
  onConfirm: (optionSelected?: boolean) => Promise<boolean | void>;
  optionLabel?: string;
  confirmLabel?: string;
};

export type TrackedOperationStatus = {
  operation_id: string;
  kind: string;
  status: "unknown" | "processing" | "completed" | "failed";
  detail: string;
};

