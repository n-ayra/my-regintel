
import NewsletterEmail from '@/app/components/NewsletterEmail';
import { fetchUpdates } from '@/lib/fetchUpdates';

// ==========================================
// NEWSLETTER PREVIEW COMPONENT
// ==========================================
export default async function NewsletterPreview() {
  
  // Fetches latest updates on the server before rendering
  const articles = await fetchUpdates();

  // Returns the email template populated with those updates
  return <NewsletterEmail articles={articles} />;
}