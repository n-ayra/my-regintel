export type RawArticle = {
  id: number;
  created_at: string;
  url: string;
  title?: string;
  snippet?: string;
  source?: string;
  is_processed: boolean;
};

export type VerifiedUpdate = {
  id: number;
  created_at: string;
  deduced_title: string;
  summary_text: string;
  impact_level: 'High'|'Medium'|'Low';
  primary_source_url?: string;
  related_article_ids?: number[];
  verification_status: boolean;
};
