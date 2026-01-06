// src/app/newsletter-preview/page.tsx
import NewsletterEmail from '@/app/components/NewsletterEmail';
import { fetchUpdates } from '@/lib/fetchUpdates';

export default async function NewsletterPreview() {
  const articles = await fetchUpdates();

  return <NewsletterEmail articles={articles} />;
}
