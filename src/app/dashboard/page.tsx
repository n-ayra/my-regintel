'use client';

import { useEffect, useState } from 'react';

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

  // Fetch updates via API route
  async function fetchUpdates() {
    setLoading(true);
    try {
      const res = await fetch('/api/verified-updates');
      const data = await res.json();
      setUpdates(data);
    } catch (err) {
      console.error('Fetch updates error', err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUpdates();
  }, []);

  const toggleExpand = (id: number) => {
    setExpanded(expanded === id ? null : id);
  };

  const impactColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-500';
      case 'Medium': return 'bg-yellow-400';
      case 'Low': return 'bg-green-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Regulatory Intelligence Dashboard</h1>

      
		<button
		onClick={async () => {
			const res = await fetch('/api/run-pipeline');
			const data = await res.json();
			console.log('Pipeline result:', data);
		}}
		>
		Refresh
		</button>


      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {updates.map(update => (
            <div key={update.id} className="border rounded shadow p-4">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleExpand(update.id)}
              >
                <h2 className="text-lg font-semibold">{update.deduced_title}</h2>
                <span className={`px-2 py-1 text-white text-sm rounded ${impactColor(update.impact_level)}`}>
                  {update.impact_level}
                </span>
              </div>

              {expanded === update.id && (
                <div className="mt-3 text-sm space-y-2">
                  <p>{update.summary_text}</p>
                  {update.primary_source_url && (
                    <p>
                      Primary Source:{' '}
                      <a href={update.primary_source_url} target="_blank" rel="noopener noreferrer"
                         className="text-blue-600 underline">
                        {update.primary_source_url}
                      </a>
                    </p>
                  )}
                  {update.related_article_ids?.length > 0 && (
                    <p>Related Articles IDs: {update.related_article_ids.join(', ')}</p>
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
