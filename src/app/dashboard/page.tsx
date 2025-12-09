'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

type Article = {
  id: number;
  title: string;
  url: string;
  summary?: string;
};

type VerifiedUpdate = {
  id: number;
  regulation: string;
  deduced_title: string;
  summary_text: string;
  impact_level: 'High' | 'Medium' | 'Low';
  primary_source_url: string | null;
  related_articles: Article[]; 
  deduced_published_date: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const [updates, setUpdates] = useState<VerifiedUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [modalOpen, setModalOpen] = useState<VerifiedUpdate | null>(null);

  // Fetch latest updates (join pointer table with verified_updates)
  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/latest-verified-updates'); // new API endpoint
      const data = await res.json();
      setUpdates(data);
    } catch (err) {
      console.error('Fetch latest updates error', err);
    }
    setLoading(false);
  };

  const runPipeline = async () => {
    setPipelineRunning(true);
    try {
      const res = await fetch('/api/run-pipeline');
      const data = await res.json();
      console.log('Pipeline result:', data);
      await fetchUpdates(); // refresh after running pipeline
    } catch (err) {
      console.error('Pipeline error', err);
    }
    setPipelineRunning(false);
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const impactColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-500';
      case 'Medium': return 'bg-yellow-400';
      case 'Low': return 'bg-green-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header & Pipeline button */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Regulatory Intelligence Dashboard</h1>
        <button
          onClick={runPipeline}
          disabled={pipelineRunning}
          className={`inline-flex items-center gap-2 px-5 py-3 font-semibold rounded-xl text-white shadow-lg transition-all ${
            pipelineRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-[var(--accent)] hover:opacity-90 hover:scale-105'
          }`}
        >
          {pipelineRunning ? 'Processing...' : 'Start Scanning'}
          {!pipelineRunning && <ArrowRight className="h-5 w-5" />}
        </button>
      </div>

      {/* Loading / Empty states */}
      {loading ? (
        <p className="text-center text-lg text-[var(--foreground)]/70 py-10">
          Loading latest updates...
        </p>
      ) : updates.length === 0 ? (
        <p className="text-center text-lg text-[var(--foreground)]/70 py-10">
          No latest updates found.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {updates.map((update) => (
            <div
              key={update.id}
              className="bg-white dark:bg-[var(--secondary)] rounded-xl shadow-md p-6 hover:shadow-xl transition-all cursor-pointer"
              onClick={() => setModalOpen(update)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-black dark:text-white">{update.deduced_title}</h2>
                  <p className="text-gray-500 text-sm mt-1">{update.regulation}</p>
                  {update.deduced_published_date && (
                    <p className="text-gray-400 text-xs mt-1">
                      Latest deduced date: {new Date(update.deduced_published_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className={`px-4 py-1 rounded-full text-xs font-semibold text-white ${impactColor(update.impact_level)}`}>
                  {update.impact_level}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-4 line-clamp-3">{update.summary_text}</p>
              <p className="text-xs mt-2 text-gray-400">Click to view more →</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[var(--secondary)] rounded-xl shadow-xl w-full max-w-3xl p-6 relative animate-fade-in">
            <button
              onClick={() => setModalOpen(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold mb-2">{modalOpen.deduced_title}</h2>
            <p className="text-gray-500 text-sm mb-4">{modalOpen.regulation}</p>
            {modalOpen.deduced_published_date && (
              <p className="text-gray-400 text-xs mb-2">
                Latest deduced date: {new Date(modalOpen.deduced_published_date).toLocaleDateString()}
              </p>
            )}
            <p className="text-gray-700 dark:text-gray-300 mb-4">{modalOpen.summary_text}</p>
            {modalOpen.primary_source_url && (
              <a
                href={modalOpen.primary_source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm"
              >
                View Primary Source
              </a>
            )}
            {modalOpen.related_articles?.length > 0 && (
            <div className="mt-4 space-y-2">
              {modalOpen.related_articles?.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-500">Related Articles</h3>
                {modalOpen.related_articles.map(article => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm block"
                  >
                    {article.title || article.url}
                  </a>
                ))}
              </div>
            )}


            </div>
          )}


          </div>
        </div>
      )}
    </div>
  );
}
