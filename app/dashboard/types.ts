export interface Guide {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string;
  is_pinned: boolean;
  views: number;
  category: {
    name: string;
    id: string;
  } | null;
}

export interface Category {
  id: string;
  name: string;
}