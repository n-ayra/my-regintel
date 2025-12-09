'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

type VerifiedUpdate = {
  id: number;
  regulation: string;
  deduced_title: string;
  summary_text: string;
  impact_level: 'High' | 'Medium' | 'Low';
  primary_source_url: string | null;
  related_article_ids: number[];
  created_at: string;
};

export default function DashboardPage() {
  const [updates, setUpdates] = useState<VerifiedUpdate[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/verified-updates');
      const data = await res.json();
      setUpdates(data);
    } catch (err) {
      console.error('Fetch updates error', err);
    }
    setLoading(false);
  };

  const runPipeline = async () => {
    setPipelineRunning(true);
    try {
      const res = await fetch('/api/run-pipeline');
      const data = await res.json();
      console.log('Pipeline result:', data);
      await fetchUpdates(); // refresh data after pipeline
    } catch (err) {
      console.error('Pipeline error', err);
    }
    setPipelineRunning(false);
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const toggleExpand = (id: number) => setExpanded(expanded === id ? null : id);

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

      {loading ? (
        <p className="text-center text-lg text-[var(--foreground)]/70 py-10">
          Loading updates...
        </p>
      ) : updates.length === 0 ? (
        <p className="text-center text-lg text-[var(--foreground)]/70 py-10">
          No updates found.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {updates.map((update) => (
            <div
              key={update.id}
              className="bg-white dark:bg-[var(--secondary)] rounded-xl shadow-md p-6 hover:shadow-xl transition-all"
            >
              {/* HEADER: Title + Impact badge */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-black dark:text-white">
                    {update.deduced_title}
                  </h2>

                  <p className="text-gray-500 text-sm mt-1">
                    {update.regulation}
                  </p>
                </div>

                <span
                  className={`px-4 py-1 rounded-full text-xs font-semibold text-white ${impactColor(
                    update.impact_level
                  )}`}
                >
                  {update.impact_level}
                </span>
              </div>

              {/* SUMMARY PREVIEW */}
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-4 line-clamp-3">
                {update.summary_text}
              </p>

              {/* VIEW MORE BUTTON */}
              <button
                onClick={() => toggleExpand(update.id)}
                className="mt-4 ml-auto block bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold py-2 px-4 rounded-full transition"
              >
                VIEW MORE
              </button>

              {/* EXPANDED SECTION */}
              {expanded === update.id && (
                <div className="mt-4 border-t border-gray-300 pt-4 space-y-2">
                  <p className="text-sm">{update.summary_text}</p>

                  {update.primary_source_url && (
                    <a
                      href={update.primary_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline text-sm"
                    >
                      Primary Source
                    </a>
                  )}

                  {update.related_article_ids?.length > 0 && (
                    <p className="text-sm">
                      Related Articles: {update.related_article_ids.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
