export interface Category {
  id: string;
  name: string;
  organization_id: string;
}

export interface Guide {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  organization_id: string;
  created_by?: string | null;
  views?: number;
  category?: Category | null;
  category_id?: string | null;
}