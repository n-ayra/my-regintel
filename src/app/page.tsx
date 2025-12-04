import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.32))] px w-full bg-gradient-to-b from-[var(--background)] to-[var(--secondary)] px-4 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden w-full text-center px-4">
        {/* Background gradient hint */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-[var(--secondary)] to-transparent -z-10" />
        
        <div className="container mx-auto">
          <div className="inline-flex items-center rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1 text-sm font-medium text-[var(--accent)] mb-6">
            <span className="flex h-2 w-2 rounded-full bg-[var(--accent)] mr-2"></span>
            v1.0 is now live
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-[var(--foreground)] sm:text-7xl mb-6">
            Regintels
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-[var(--foreground)]/80 mb-10">
            Product Compliance Monitoring for 25 Products Across 21 Global Regulations
          </p>
          <div className="flex justify-center">
            
            <a 
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-[var(--accent)] text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[var(--accent)]/20"
            >
              View Dashboard <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}