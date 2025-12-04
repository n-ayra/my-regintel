// components/ArticleCard.jsx
import React from "react";

const CalendarIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const impactBadgeClasses = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
  none: "bg-gray-200 text-gray-600",
};

const ArticleCard = ({
  isLoaded = true,
  title = "Article Title",
  regulationName = "Regulation Name",
  summary = "Summary placeholder...",
  impact_level = "none",
  matches = { key_identifiers: [], trigger_events: [], review_conditions_met: [] },
  publishedDate = "Month Date, Year",
  retrievedDate = "Month Date, Year",
  sourceLink = "#",
  onViewMore = () => {}
}) => {
  if (!isLoaded) return <div className="p-6 bg-white border rounded-xl shadow-lg w-full animate-pulse">Loading…</div>;

  return (
    <div className="p-6 bg-white border border-gray-100 rounded-xl shadow-lg w-full transition hover:shadow-xl">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
            {title}
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${impactBadgeClasses[impact_level]}`}>
              {impact_level.toUpperCase()}
            </span>
          </h2>

          <p className="text-sm text-gray-500 mt-1 pb-2">{regulationName}</p>
          <div className="w-full border-b border-gray-200"></div>
        </div>

        <a href={sourceLink} target="_blank" className="text-xs text-blue-600 font-medium hover:text-blue-800">VIEW SOURCE</a>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed mt-4">{summary}</p>

      <div className="mt-4 space-y-3 text-xs text-gray-600">
        {matches.key_identifiers?.length > 0 && (
          <div>
            <p className="font-semibold">Matched Identifiers:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {matches.key_identifiers.map((m, i) => (
                <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md">{m}</span>
              ))}
            </div>
          </div>
        )}

        {matches.trigger_events?.length > 0 && (
          <div>
            <p className="font-semibold">Trigger Events:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {matches.trigger_events.map((m, i) => (
                <span key={i} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md">{m}</span>
              ))}
            </div>
          </div>
        )}

        {matches.review_conditions_met?.length > 0 && (
          <div>
            <p className="font-semibold">Review Conditions Met:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {matches.review_conditions_met.map((m, i) => (
                <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded-md">{m}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1 text-xs text-gray-500">
        <div className="flex items-center">
          <CalendarIcon className="mr-2 text-orange-500" />
          <span>Published: <span className="font-medium">{publishedDate}</span></span>
        </div>
        <div className="flex items-center">
          <CalendarIcon className="mr-2 text-orange-500" />
          <span>Retrieved: <span className="font-medium">{retrievedDate}</span></span>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={onViewMore} className="px-6 py-2 text-sm bg-gray-200 rounded-lg text-gray-700">VIEW MORE</button>
      </div>
    </div>
  );
};

export default ArticleCard;
