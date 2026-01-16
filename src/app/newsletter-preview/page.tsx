import NewsletterEmail from '@/app/components/NewsletterEmail';
import { fetchUpdates } from '@/lib/fetchUpdates';

// Forcing this page to render dynamically on request 
export const dynamic = "force-dynamic";

// ==========================================
// NEWSLETTER PREVIEW COMPONENT
// ==========================================
export default async function NewsletterPreview() {
  // Fetches latest updates on the server at request time
  const articles = await fetchUpdates();

  // Returns the email template populated with those updates
  return <NewsletterEmail articles={articles} />;
}
