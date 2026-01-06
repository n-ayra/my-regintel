'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, X, AlertCircle, CheckCircle, Zap, RefreshCw, ExternalLink, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

type Article = {
  id: number;
  title: string;
  url: string;
};

type VerifiedUpdate = {
  id: number;
  regulation: string;
  regulation_name: string;
  deduced_title: string;
  summary_text: string;
  impact_level: 'high' | 'medium' | 'low';
  primary_source_url: string | null;
  related_articles: Article[];
  deduced_published_date: string | null;
  created_at: string;
};

// ==========================================
// 2. HELPER / UTILITY FUNCTIONS
// ==========================================

/**
 * Returns UI labels and colors based on how many articles support the update
 */
const getConfidence = (count: number) => {
  if (count >= 4) return { label: 'High', color: 'bg-gradient-to-r from-green-500 to-emerald-600', icon: <CheckCircle className="h-4 w-4 inline mr-1" /> };
  if (count >= 2) return { label: 'Medium', color: 'bg-gradient-to-r from-yellow-500 to-amber-600', icon: <Zap className="h-4 w-4 inline mr-1" /> };
  return { label: 'Low', color: 'bg-gradient-to-r from-red-500 to-rose-600', icon: <AlertCircle className="h-4 w-4 inline mr-1" /> };
};

/**
 * Formats a date string into UK format (DD/MM/YYYY)
 */
const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'No Deduced Date';
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? 'No Deduced Date' : date.toLocaleDateString('en-GB');
};

/**
 * Determines the color and icon based on the impact level (High/Medium/Low)
 */
const impactColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'high': return { 
      color: 'bg-gradient-to-r from-red-600 to-pink-700',
      icon: <AlertCircle className="h-4 w-4 inline mr-1" />
    };
    case 'medium': return { 
      color: 'bg-gradient-to-r from-yellow-500 to-orange-600',
      icon: <Zap className="h-4 w-4 inline mr-1" />
    };
    case 'low': return { 
      color: 'bg-gradient-to-r from-green-500 to-teal-600',
      icon: <CheckCircle className="h-4 w-4 inline mr-1" />
    };
    default: return { color: 'bg-gradient-to-r from-gray-400 to-gray-500', icon: null };
  }
};

// ==========================================
// 3. ANIMATION SETTINGS (Framer Motion)
// ==========================================

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  hover: { y: -8, scale: 1.02, transition: { duration: 0.2, ease: "easeInOut" } },
  tap: { scale: 0.98 }
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
};

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

// ==========================================
// 4. MAIN COMPONENT
// ==========================================

export default function DashboardPage() {
  // --- STATE ---
  const [updates, setUpdates] = useState<VerifiedUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [modalOpen, setModalOpen] = useState<VerifiedUpdate | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // --- API FUNCTIONS ---

  /**
   * Loads data from the database
   */
  const fetchUpdates = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetch('/api/latest-verified-updates');
      const data = await res.json();
      setUpdates(data);
    } catch (err) {
      console.error('Fetch latest updates error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Starts the background scanning process
   */
  const runPipeline = async () => {
    setPipelineRunning(true);
    try {
      const res = await fetch('/api/run-pipeline');
      await res.json();
      await fetchUpdates(); // Refresh list after scan finish
    } catch (err) {
      console.error('Pipeline error', err);
    } finally {
      setPipelineRunning(false);
    }
  };

  // Run on initial page load
  useEffect(() => {
    fetchUpdates();
  }, []);

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  // --- FILTERING & SORTING LOGIC ---
  const filteredAndSortedUpdates = updates
    .filter(u =>
      u.regulation_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by Name
      if (sortKey === 'name') {
        const nameA = a.regulation_name.toLowerCase();
        const nameB = b.regulation_name.toLowerCase();
        return sortOrder === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }

      // Sort by Date
      const dateA = a.deduced_published_date
        ? new Date(a.deduced_published_date).getTime()
        : 0;
      const dateB = b.deduced_published_date
        ? new Date(b.deduced_published_date).getTime()
        : 0;

      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });


  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
        
        {/* ANIMATED BACKGROUND DECORATION */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto">
          
          {/* HEADER: TITLE AND ACTIONS */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-200 dark:border-gray-700 pb-6 sticky top-0 bg-gradient-to-r from-white/80 to-white/60 dark:from-gray-900/80 dark:to-gray-900/60 backdrop-blur-lg z-50 rounded-2xl p-6 shadow-lg"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Regulatory Intelligence Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Real-time monitoring of regulatory changes
              </p>
            </div>
            
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fetchUpdates(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={runPipeline}
                disabled={pipelineRunning}
                className={`inline-flex items-center gap-3 px-6 py-3 font-semibold rounded-xl text-white shadow-lg transition-all relative overflow-hidden group ${
                  pipelineRunning 
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {pipelineRunning ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Start Scanning
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
                {!pipelineRunning && (
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6 }}
                  />
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* STATS BANNER: SUMMARY NUMBERS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Updates</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{updates.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <p className="text-gray-600 dark:text-gray-400 text-sm">High Impact</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                {updates.filter(u => u.impact_level === 'high').length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Avg. Confidence</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {updates.length > 0 
                  ? Math.round((updates.reduce((acc, u) => acc + (u.related_articles?.length || 0), 0) / updates.length) * 25) + '%'
                  : '0%'
                }
              </p>
            </div>
          </motion.div>

          {/* SEARCH & SORT CONTROLS */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg mb-8 flex flex-col md:flex-row gap-4 items-center">
            <input
              type="text"
              placeholder="Search by regulation name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as 'date' | 'name')}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Regulation Name</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>


          {/* LOADING STATE DISPLAY */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-32 w-32 rounded-full border-t-4 border-b-4 border-blue-600 animate-spin"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <RefreshCw className="h-8 w-8 text-blue-600 animate-pulse" />
                </div>
              </div>
              <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 animate-pulse">
                Loading latest updates...
              </p>
            </div>
          ) : updates.length === 0 ? (
            /* EMPTY STATE DISPLAY */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-lg"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                <AlertCircle className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                No updates found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Start scanning to discover regulatory changes
              </p>
              <button
                onClick={runPipeline}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                <Zap className="h-5 w-5" />
                Run First Scan
              </button>
            </motion.div>
          ) : (
            /* DATA GRID DISPLAY */
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredAndSortedUpdates.map((update) => {
                const articleCount = update.related_articles?.length ?? 0;
                const confidence = getConfidence(articleCount);
                const impact = impactColor(update.impact_level);

                return (
                  <motion.div
                    key={update.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    whileTap="tap"
                    className="group relative cursor-pointer"
                    onClick={() => setModalOpen(update)}
                  >
                    {/* CARD BORDER GLOW EFFECT */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
                    
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col justify-between min-h-[280px] overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-bl-3xl" />
                      
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {update.deduced_title}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 line-clamp-1">
                              {update.regulation_name}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                        </div>
                        
                        {update.deduced_published_date && (
                          <div className="flex items-center text-gray-400 text-xs mb-3">
                            <span className="animate-pulse h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                            Updated: {formatDate(update.deduced_published_date)}
                          </div>
                        )}
                        
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-3 line-clamp-3 leading-relaxed">
                          {update.summary_text}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-6">
                        <motion.span
                          whileHover={{ scale: 1.05 }}
                          className={`px-4 py-2 rounded-full text-xs font-semibold text-white flex items-center shadow-md ${impact.color}`}
                        >
                          {impact.icon} {capitalize(update.impact_level)} Impact
                        </motion.span>

                        <motion.span
                          whileHover={{ scale: 1.05 }}
                          className={`px-4 py-2 rounded-full text-xs font-semibold text-white flex items-center shadow-md ${confidence.color}`}
                        >
                          {confidence.icon} {confidence.label} Confidence
                        </motion.span>
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* DETAIL MODAL POPUP */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setModalOpen(null)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* MODAL HEADER */}
              <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                <div className="flex items-start justify-between">
                  <div className="pr-8">
                    <h2 className="text-2xl font-bold text-white">{modalOpen.deduced_title}</h2>
                    <p className="text-blue-100 text-sm mt-1">{modalOpen.regulation_name}</p>
                  </div>
                  <motion.button
                    whileHover={{ rotate: 90, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setModalOpen(null)}
                    className="text-white hover:text-blue-200 p-1"
                  >
                    <X className="h-6 w-6" />
                  </motion.button>
                </div>
                
                <div className="flex items-center gap-4 mt-4">
                  <span className={`px-4 py-2 rounded-full text-xs font-semibold text-white flex items-center ${impactColor(modalOpen.impact_level).color}`}>
                    {impactColor(modalOpen.impact_level).icon} {capitalize(modalOpen.impact_level)} Impact
                  </span>
                  <span className="text-white/80 text-sm flex items-center">
                    <span className="animate-pulse h-2 w-2 rounded-full bg-green-400 mr-2"></span>
                    {formatDate(modalOpen.deduced_published_date)}
                  </span>
                </div>
              </div>

              {/* MODAL CONTENT BODY */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800 dark:text-white">
                    <div className="h-1 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mr-3"></div>
                    Summary
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                    {modalOpen.summary_text}
                  </p>
                </motion.section>

                {modalOpen.primary_source_url && (
                  <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800 dark:text-white">
                      <div className="h-1 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mr-3"></div>
                      Primary Source
                    </h3>
                    <motion.a
                      whileHover={{ x: 5 }}
                      href={modalOpen.primary_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                    >
                      View Source Document
                      <ExternalLink className="h-4 w-4" />
                    </motion.a>
                  </motion.section>
                )}

                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800 dark:text-white">
                    <div className="h-1 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mr-3"></div>
                    Related Articles ({modalOpen.related_articles?.length || 0})
                  </h3>
                  {modalOpen.related_articles?.length > 0 ? (
                    <div className="space-y-3">
                      {modalOpen.related_articles.map((article, idx) => (
                        <motion.a
                          key={article.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * idx }}
                          whileHover={{ x: 5, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                        >
                          <span className="text-blue-600 dark:text-blue-400 group-hover:underline text-sm font-medium">
                            {article.title || article.url}
                          </span>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                        </motion.a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-xl">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No related articles found.</p>
                    </div>
                  )}
                </motion.section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}