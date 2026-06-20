import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appealText, setAppealText] = useState({});
  const [appealStatus, setAppealStatus] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [verdictCache, setVerdictCache] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef(null);
  const { user, logout } = useAuth();

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  async function loadHistory() {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;

    const res = await api.get('/submissions', { params });
    setSubmissions(res.data.submissions);

    const appealsRes = await api.get('/appeals');
    const statusMap = {};
    appealsRes.data.appeals.forEach(a => {
      statusMap[a.submission._id || a.submission] = a.status;
    });
    setAppealStatus(statusMap);
  }

  useEffect(() => { loadHistory(); }, [statusFilter, categoryFilter, fromDate, toDate]);

  function clearFilters() {
    setStatusFilter('');
    setCategoryFilter('');
    setFromDate('');
    setToDate('');
  }

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (files.length === 0) return;

    setLoading(true);
    setResult(null);
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));

    try {
      const res = await api.post('/submissions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newCache = {};
      res.data.results.forEach(r => { newCache[r.submission._id] = r.verdict; });
      setVerdictCache(prev => ({ ...prev, ...newCache }));

      setResult({ count: res.data.results.length });
      setFiles([]);
      loadHistory();
    } catch (err) {
      setResult({ error: err.response?.data?.message || 'Submission failed' });
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(submissionId) {
    if (expandedId === submissionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(submissionId);

    if (!verdictCache[submissionId]) {
      const res = await api.get(`/submissions/${submissionId}`);
      setVerdictCache(prev => ({ ...prev, [submissionId]: res.data.verdict }));
    }
  }

  async function handleAppeal(submissionId) {
    const justification = appealText[submissionId];
    if (!justification || justification.trim().length === 0) return;

    try {
      await api.post('/appeals', { submissionId, justification });
      setAppealStatus(prev => ({ ...prev, [submissionId]: 'pending' }));
      setAppealText(prev => ({ ...prev, [submissionId]: '' }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to file appeal');
    }
  }

  return (
    <div className="font-manhope max-w-2xl mx-auto my-16 px-4 text-slate-900 bg-white antialiased">
      
      {/* Structural Minimal Header */}
      <div className="flex justify-between items-baseline border-b border-slate-100 pb-5 mb-10">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1">Workspace Overview</span>
          <h2 className="text-xl font-medium tracking-tight text-slate-800">
            Welcome, {user?.name || 'User'}
          </h2>
        </div>
        <button 
          onClick={logout} 
          className="text-xs font-medium text-slate-400 hover:text-slate-900 transition-colors duration-150 py-1"
        >
          Sign out
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Mainline Drop Box Zone */}
        <div 
          className={`border border-slate-200 rounded-lg p-12 text-center cursor-pointer mb-5 transition-all duration-200 ${
            isDragging 
              ? 'border-slate-900 bg-slate-50/50 scale-[0.995]' 
              : 'bg-white hover:border-slate-400 hover:bg-slate-50/30'
          }`}
          onClick={triggerFileSelect}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-sm font-medium text-slate-700 mb-1">
            Drag and drop images here, or choose file
          </div>
          <span className="text-xs text-slate-400 font-light block">
            JPEG, PNG, or WEBP up to 10MB
          </span>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={e => setFiles(Array.from(e.target.files))}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <div className="mb-4 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-md px-3 py-2 flex items-center justify-between">
            <span>Selected assets: {files.length} file(s) queued</span>
            <button type="button" onClick={() => setFiles([])} className="text-slate-400 hover:text-slate-600 text-[10px] uppercase tracking-wider font-semibold">Clear</button>
          </div>
        )}

        {/* Minimal Primary Button */}
        <button 
          type="submit" 
          disabled={loading || files.length === 0}
          className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-medium text-sm transition-all hover:bg-slate-800 active:bg-slate-950 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed duration-150"
        >
          {loading ? 'Processing analysis...' : 'Analyze queue'}
        </button>
      </form>

      {result?.count && (
        <div className="text-xs font-medium text-emerald-700 bg-emerald-50/60 border border-emerald-100 rounded-md p-3 mb-6">
          Processed {result.count} image configuration matrices successfully.
        </div>
      )}
      {result?.error && (
        <div className="text-xs font-medium text-rose-700 bg-rose-50/60 border border-rose-100 rounded-md p-3 mb-6">
          Error occurrence flagged: {result.error}
        </div>
      )}

      {/* Filter Section */}
      <div className="mt-12 mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
          Submission Registry
        </h3>
        
        <div className="flex gap-x-4 gap-y-2 items-center flex-wrap text-xs text-slate-600 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Status</span>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent border-b border-slate-200 py-1 pr-4 focus:border-slate-900 outline-none font-medium cursor-pointer"
            >
              <option value="">All</option>
              <option value="approved">Approved</option>
              <option value="flagged">Flagged</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Category</span>
            <select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-transparent border-b border-slate-200 py-1 pr-4 focus:border-slate-900 outline-none font-medium cursor-pointer max-w-[120px]"
            >
              <option value="">All</option>
              <option value="graphic_violence">Violence</option>
              <option value="hate_symbols">Hate Symbols</option>
              <option value="self_harm">Self Harm</option>
              <option value="extremist_propaganda">Propaganda</option>
              <option value="weapons_contraband">Weapons</option>
              <option value="harassment_humiliation">Harassment</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Timeline</span>
            <input 
              type="date" 
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)} 
              className="bg-transparent border-b border-slate-200 py-0.5 outline-none text-slate-700"
            />
            <span className="text-slate-300">—</span>
            <input 
              type="date" 
              value={toDate} 
              onChange={e => setToDate(e.target.value)} 
              className="bg-transparent border-b border-slate-200 py-0.5 outline-none text-slate-700"
            />
          </div>

          {(statusFilter || categoryFilter || fromDate || toDate) && (
            <button 
              onClick={clearFilters} 
              type="button"
              className="text-slate-400 hover:text-slate-900 font-medium ml-auto border-b border-dotted border-slate-300"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {submissions.length === 0 && <p className="text-xs text-slate-400 italic font-light py-4">No logged criteria entries available.</p>}

      {/* Clean Minimal History Elements */}
      <div className="divide-y divide-slate-100">
        {submissions.map(s => {
          const existingAppealStatus = appealStatus[s._id];
          const canAppeal = s.status !== 'approved' && !existingAppealStatus;
          const isExpanded = expandedId === s._id;
          const verdict = verdictCache[s._id];

          return (
            <div key={s._id} className="py-5 first:pt-0 last:pb-0">
              <div className="flex gap-4 items-start">
                <img
                  src={`${API_BASE}${s.imageUrl}`}
                  alt="registry file visual"
                  className="w-16 h-16 object-cover rounded bg-slate-50 border border-slate-100 transition-all duration-300"
                />
                
                <div className="flex-1 min-w-0 text-xs">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className={`font-semibold tracking-wide uppercase ${
                      s.status === 'approved' ? 'text-emerald-600' : s.status === 'flagged' ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {s.status}
                    </span>
                    <span className="text-slate-400 font-light text-[11px]">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex gap-3 items-center mt-3">
                    <button 
                      onClick={() => toggleExpand(s._id)} 
                      className="text-slate-500 hover:text-slate-900 font-medium transition-colors duration-150"
                    >
                      {isExpanded ? 'Hide metrics' : 'Review AI analysis'}
                    </button>

                    {existingAppealStatus && (
                      <span className="text-slate-400 font-light italic">
                        • Appeal status: {existingAppealStatus}
                      </span>
                    )}
                  </div>

                  {canAppeal && (
                    <div className="mt-3 max-w-md bg-slate-50/50 p-2.5 rounded border border-slate-100">
                      <textarea
                        placeholder="State justification criteria..."
                        value={appealText[s._id] || ''}
                        onChange={e => setAppealText(prev => ({ ...prev, [s._id]: e.target.value }))}
                        rows={1}
                        className="w-full text-xs p-1 bg-transparent border-b border-slate-200 text-slate-700 placeholder-slate-400 focus:border-slate-400 outline-none resize-none mb-2"
                      />
                      <button 
                        onClick={() => handleAppeal(s._id)}
                        className="text-slate-600 hover:text-slate-900 font-semibold uppercase tracking-wider text-[10px]"
                      >
                        File Appeal
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Expansion Detail Metrics */}
              {isExpanded && (
                <div className="mt-4 ml-20 bg-slate-50/60 rounded-lg p-3 border border-slate-100/80">
                  {!verdict && <p className="text-[11px] text-slate-400 font-light tracking-wide">Retrieving node data layers...</p>}
                  {verdict && (
                    <ul className="space-y-2.5 m-0 p-0 list-none text-[11px]">
                      {verdict.categoryResults.map(r => (
                        <li key={r.category} className="text-slate-600">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <span className="font-medium text-slate-700">{r.category.replace('_', ' ')}</span>
                            <span className={r.detected ? "text-rose-600 font-medium" : "text-slate-400 font-light"}>
                              {r.detected ? `Flagged (${r.confidence}%)` : 'Clear'}
                            </span>
                          </div>
                          {r.reasoning && (
                            <p className="text-slate-400 font-light leading-normal">{r.reasoning}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}