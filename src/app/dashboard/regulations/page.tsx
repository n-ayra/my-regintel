'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Edit2, Globe, Calendar, FileText, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

type Regulation = {
  id: number;
  name: string;
  last_scanned_at: string | null;
  regulation_search_profiles?: {
    authority: string;
    search_queries: string[];
    primary_sources?: string[] | null;
  };
};

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================

export default function RegulationsPage() {
  // --- STATE ---
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<Regulation | null>(null);

  // --- ACTIONS ---

  /** Fetches all regulations and their search profiles */
  const fetchRegs = async () => {
    setLoading(true);
    const res = await fetch('/api/regulations');
    const data = await res.json();
    setRegs(data);
    setLoading(false);
  };

  useEffect(() => { fetchRegs(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this regulation?')) return;
    await fetch(`/api/regulations/${id}`, { method: 'DELETE' });
    fetchRegs();
  };

  const handleAdd = () => {
    setEditingReg(null); // Clear form for new entry
    setModalOpen(true);
  };

  const handleEdit = (reg: Regulation) => {
    setEditingReg(reg); // Load existing data into form
    setModalOpen(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-8 bg-[var(--background)] text-[var(--foreground)]">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Regulations</h1>
          <p className="text-[var(--foreground)]/70">Configure and manage regulatory monitoring profiles</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleAdd}
          className="mt-4 md:mt-0 flex items-center gap-2 bg-[var(--accent)] text-white px-5 py-2 rounded-xl font-semibold shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Regulation
        </motion.button>
      </div>

      {loading ? (
        /* LOADING SPINNER */
        <div className="flex justify-center items-center py-20">
          <div className="h-16 w-16 border-t-4 border-b-4 border-[var(--accent)] rounded-full animate-spin"></div>
        </div>
      ) : regs.length === 0 ? (
        /* EMPTY STATE */
        <div className="text-center py-16 bg-white/50 dark:bg-gray-800/50 rounded-2xl shadow border border-gray-200/50 dark:border-gray-700/50">
          <Globe className="mx-auto mb-4 h-12 w-12 text-[var(--accent)]/70" />
          <p className="text-lg font-semibold mb-2">No regulations configured</p>
          <p className="text-[var(--foreground)]/70 mb-4">Add your first regulation to start monitoring</p>
          <button onClick={handleAdd} className="inline-flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-xl font-semibold">
            <Plus className="h-4 w-4" /> Add Regulation
          </button>
        </div>
      ) : (
        /* GRID OF REGULATION CARDS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {regs.map(reg => (
            <motion.div
              key={reg.id}
              whileHover={{ y: -2 }}
              className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow p-5 flex flex-col justify-between border border-gray-200/50 dark:border-gray-700/50"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-[var(--accent)]" />
                  </div>
                  <h2 className="font-semibold text-lg line-clamp-2">{reg.name}</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(reg)} className="p-1 rounded-lg text-blue-500 hover:bg-blue-500/10">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(reg.id)} className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* CARD DETAILS: AUTHORITY, QUERIES, AND LAST SCAN */}
              <div className="flex flex-col gap-2 text-sm text-[var(--foreground)]/80">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4 text-[var(--foreground)]/50" />
                  <span>{reg.regulation_search_profiles?.authority || '-'}</span>
                </div>
                <div>
                  <p className="text-xs flex items-center gap-1"><Search className="h-3 w-3" /> Queries</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {reg.regulation_search_profiles?.search_queries?.slice(0, 3).map((q, i) => (
                      <span key={i} className="text-[var(--accent)] text-xs px-2 py-1 rounded-lg bg-[var(--accent)]/10">{q}</span>
                    ))}
                    {reg.regulation_search_profiles?.search_queries && reg.regulation_search_profiles.search_queries.length > 3 && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        +{reg.regulation_search_profiles.search_queries.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-[var(--foreground)]/50" />
                  <span className={reg.last_scanned_at ? 'text-emerald-500' : 'text-amber-500'}>
                    Last scan: {formatDate(reg.last_scanned_at)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* MODAL OVERLAY FOR ADDING/EDITING */}
      <AnimatePresence>
        {modalOpen && (
          <RegulationForm
            regulation={editingReg || undefined}
            onClose={() => setModalOpen(false)}
            onSave={fetchRegs}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// 3. REGULATION FORM COMPONENT (MODAL)
// ==========================================

type RegulationFormProps = {
  regulation?: Regulation;
  onClose: () => void;
  onSave: () => void;
};

function RegulationForm({ regulation, onClose, onSave }: RegulationFormProps) {
  // --- FORM STATE ---
  const [name, setName] = useState(regulation?.name || '');
  const [authority, setAuthority] = useState(regulation?.regulation_search_profiles?.authority || '');
  const [searchQueries, setSearchQueries] = useState(
    regulation?.regulation_search_profiles?.search_queries?.join(', ') || ''
  );
  const [primarySources, setPrimarySources] = useState(
    regulation?.regulation_search_profiles?.primary_sources?.join(', ') || ''
  );

  /** Submits the form to either POST (new) or PUT (edit) endpoints */
 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

// Convert comma-separated strings into arrays
    const searchQueriesArray = searchQueries
        .split(',')
        .map(q => q.trim())
        .filter(Boolean);

    const primarySourcesArray = primarySources
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    const body = {
        name,
        authority,
        search_queries: searchQueriesArray,
        primary_sources: primarySourcesArray.length > 0 ? primarySourcesArray : null
    };

if (regulation) {
    // Edit
    await fetch(`/api/regulations/${regulation.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
    });
} else {
    // Add
    await fetch('/api/regulations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
    });
}

onSave(); // Refresh list
onClose(); // Close modal
};


  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.97 }} animate={{ scale: 1 }} exit={{ scale: 0.97 }}
        onClick={e => e.stopPropagation()} // Prevent clicking through modal to backdrop
        onSubmit={handleSubmit}
        className="bg-[var(--background)] text-[var(--foreground)] rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{regulation ? 'Edit Regulation' : 'Add Regulation'}</h2>
          <button type="button" onClick={onClose} className="text-[var(--foreground)]/70 hover:text-[var(--foreground)]"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex flex-col gap-3">
          <input type="text" placeholder="Regulation Name" value={name} onChange={e => setName(e.target.value)} className="px-3 py-2 rounded-lg border dark:bg-gray-800/50" required />
          <input type="text" placeholder="Authority (e.g. ECHA)" value={authority} onChange={e => setAuthority(e.target.value)} className="px-3 py-2 rounded-lg border dark:bg-gray-800/50" required />
          <input type="text" placeholder="Search Queries (comma separated)" value={searchQueries} onChange={e => setSearchQueries(e.target.value)} className="px-3 py-2 rounded-lg border dark:bg-gray-800/50" required />
          <input type="text" placeholder="Primary Sources (comma separated URLs)" value={primarySources} onChange={e => setPrimarySources(e.target.value)} className="px-3 py-2 rounded-lg border dark:bg-gray-800/50" />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white">
            {regulation ? 'Save' : 'Add'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}