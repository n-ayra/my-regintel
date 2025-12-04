'use client';

import React, { useState, useEffect, useMemo } from "react";
import ArticleCard from "@/components/ArticleCard";

const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const FilterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

export default function Page() {

  interface Article {
    id: string;
    article_name: string;
    regulation_name: string;
    summary: string;
    published_date: string;
    retrieved_date: string;
    type: string;
    source_link: string;
  }

  const [articleList, setArticleList] = useState<Article[]>([]);
  const [latestUpdate, setLatestUpdate] = useState<Article | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("regulation");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch historical articles
        const resArticles = await fetch("/api/get-articles");
        const dataArticles = await resArticles.json();
        setArticleList(dataArticles.articles || []);

        // Fetch latest verified SVHC update
        const resUpdate = await fetch("/api/svhc/check");
        const dataUpdate = await resUpdate.json();

        if (dataUpdate.update_found) {
          const card = dataUpdate.article_card;
          setLatestUpdate({
            id: "latest",
            article_name: card.title,
            regulation_name: "ECHA SVHC Candidate List",
            summary: card.summary,
            published_date: dataUpdate.update_date,   // use update_date
            retrieved_date: dataUpdate.update_date,  // same for consistency
            type: "Legislative Change",
            source_link: card.url
          });
        }

        setIsDataLoaded(true);
      } catch (err) {
        console.error("Failed to load articles or SVHC update:", err);
        setIsDataLoaded(true);
      }
    }
    loadData();
  }, []);

  const processedArticles = useMemo(() => {
    let result = [...articleList];
    if (latestUpdate) result.unshift(latestUpdate); // always show latest update first

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.article_name?.toLowerCase().includes(q) ||
        item.regulation_name?.toLowerCase().includes(q)
      );
    }

    if (filterType !== "all") {
      result = result.filter(item => item.type === filterType);
    }

    result.sort((a, b) => {
      if (sortBy === "regulation") {
        return a.regulation_name.localeCompare(b.regulation_name);
      }
      if (sortBy === "date") {
        return new Date(b.published_date).getTime() - new Date(a.published_date).getTime();
      }
      return 0;
    });

    return result;
  }, [articleList, latestUpdate, searchQuery, sortBy, filterType]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#f9f4f2] to-[#f5e9e6] p-6 font-sans">

      <header className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-orange-500 shadow-sm" />
        <div>
          <h1 className="text-2xl font-bold text-orange-600">RegIntels</h1>
          <p className="text-sm text-gray-600">Product Compliance Monitoring for 25 Products Across 21 Global Regulations</p>
        </div>
      </header>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4">
        <h2 className="text-3xl font-medium text-gray-900 tracking-tight">Latest Update</h2>

        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">Sort by:</span>
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-white py-1.5 pl-4 pr-8 rounded-full text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-200 cursor-pointer hover:bg-gray-50"
              >
                <option value="regulation">Regulation Name</option>
                <option value="date">Date Published</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">Filter by:</span>
            <div className="relative">
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="appearance-none bg-white py-1.5 pl-4 pr-10 rounded-full text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-200 cursor-pointer hover:bg-gray-50"
              >
                <option value="all">Select</option>
                <option value="Legislative Change">Legislative Change</option>
                <option value="Chemical Addition">Chemical Addition</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <FilterIcon className="text-gray-400 w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div className="relative w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 py-1.5 pl-4 pr-10 rounded-full text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <SearchIcon className="text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full gap-6">
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          {processedArticles.map((article) => (
            <ArticleCard
              key={article.id}
              isLoaded={isDataLoaded}
              title={article.article_name}
              regulationName={article.regulation_name}
              summary={article.summary}
              publishedDate={article.published_date}
              retrievedDate={article.retrieved_date}
              sourceLink={article.source_link}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
