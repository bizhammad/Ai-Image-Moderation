import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

const TAB_LABELS = {
  submissions: 'All Submissions',
  policies: 'Policy Config',
  appeals: 'Appeals Queue',
  analytics: 'Analytics'
};

export default function AdminPanel() {
  const [tab, setTab] = useState('submissions');
  const { logout } = useAuth();

  return (
    <div className="font-manhope max-w-4xl mx-auto my-16 px-4 text-slate-900 bg-white antialiased">
      <div className="flex justify-between items-baseline border-b border-slate-100 pb-5 mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1">
            Administration
          </span>
          <h2 className="text-xl font-medium tracking-tight text-slate-800">Control Panel</h2>
        </div>
        <button
          onClick={logout}
          className="text-xs font-medium text-slate-400 hover:text-slate-900 transition-colors duration-150 py-1"
        >
          Sign out
        </button>
      </div>

      <div className="flex gap-6 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-10 border-b border-slate-100">
        {Object.entries(TAB_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`pb-3 -mb-px border-b-2 transition-colors duration-150 ${
              tab === key ? 'border-slate-900 text-slate-900' : 'border-transparent hover:text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'submissions' && <SubmissionsTab />}
      {tab === 'policies' && <PolicyConfigTab />}
      {tab === 'appeals' && <AppealsQueueTab />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}

// ---------- All Submissions ----------
function SubmissionsTab() {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [overrideValue, setOverrideValue] = useState({});

  async function load() {
    const query = filter === 'all' ? '' : `?status=${filter === 'in_review' ? 'flagged' : filter}`;
    const res = await api.get(`/submissions/admin/all${query}`);
    setSubmissions(res.data.submissions);
  }

  useEffect(() => { load(); }, [filter]);

  async function handleDelete(id) {
    if (!window.confirm('Delete this submission permanently? This cannot be undone.')) return;
    try {
      await api.delete(`/submissions/admin/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  }

  async function handleOverride(id) {
    const newOutcome = overrideValue[id];
    if (!newOutcome) return;
    if (!window.confirm(`Override this verdict to "${newOutcome}"?`)) return;
    try {
      await api.patch(`/submissions/admin/${id}/override`, { outcome: newOutcome });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Override failed');
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-6">
        <span className="text-slate-400">Filter</span>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="bg-transparent border-b border-slate-200 py-1 pr-4 focus:border-slate-900 outline-none font-medium cursor-pointer"
        >
          <option value="all">All</option>
          <option value="in_review">In Review (Flagged)</option>
          <option value="blocked">Blocked</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {submissions.length === 0 && (
        <p className="text-xs text-slate-400 italic font-light py-4">No submissions match this filter.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {submissions.map(s => (
          <div key={s._id} className="border border-slate-100 rounded-lg p-3">
            <img
              src={`${API_BASE}${s.imageUrl}`}
              alt="submission"
              className="w-full h-32 object-cover rounded bg-slate-50 border border-slate-100 mb-2"
            />
            <div className="text-[11px] leading-relaxed">
              <span className={`font-semibold tracking-wide uppercase block ${
                s.status === 'approved' ? 'text-emerald-600' : s.status === 'flagged' ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {s.status}
              </span>
              <span className="text-slate-600 font-medium block truncate">{s.user?.name}</span>
              <span className="text-slate-400 font-light block truncate">{s.user?.email}</span>
              <span className="text-slate-400 font-light block">{new Date(s.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="flex gap-1 mt-2">
              <select
                value={overrideValue[s._id] || ''}
                onChange={e => setOverrideValue(prev => ({ ...prev, [s._id]: e.target.value }))}
                className="flex-1 text-[10px] bg-slate-50 border border-slate-100 rounded px-1 py-1 outline-none"
              >
                <option value="">Override to...</option>
                <option value="approved">Approved</option>
                <option value="flagged">Flagged</option>
                <option value="blocked">Blocked</option>
              </select>
              <button
                onClick={() => handleOverride(s._id)}
                disabled={!overrideValue[s._id]}
                className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-900 disabled:text-slate-300 px-1.5"
              >
                Set
              </button>
            </div>

            <button
              onClick={() => handleDelete(s._id)}
              className="w-full mt-2 text-[10px] font-semibold uppercase tracking-wider text-rose-500 hover:text-rose-700 transition-colors duration-150"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Policy Config ----------
function PolicyConfigTab() {
  const [policies, setPolicies] = useState([]);
  const [saving, setSaving] = useState(null);

  async function load() {
    const res = await api.get('/policies');
    setPolicies(res.data.policies);
  }

  useEffect(() => { load(); }, []);

  async function updatePolicy(category, updates) {
    setSaving(category);
    try {
      await api.patch(`/policies/${category}`, updates);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(null);
    }
  }

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="text-left text-slate-400 uppercase tracking-widest text-[10px] border-b border-slate-100">
          <th className="py-2 font-semibold">Category</th>
          <th className="py-2 font-semibold">Enabled</th>
          <th className="py-2 font-semibold">Threshold</th>
          <th className="py-2 font-semibold">Enforcement</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {policies.map(p => (
          <tr key={p.category}>
            <td className="py-3 font-medium text-slate-700">{p.category.replace(/_/g, ' ')}</td>
            <td className="py-3">
              <input
                type="checkbox"
                checked={p.enabled}
                disabled={saving === p.category}
                onChange={e => updatePolicy(p.category, { enabled: e.target.checked })}
                className="accent-slate-900"
              />
            </td>
            <td className="py-3">
              <input
                type="number"
                min="0"
                max="100"
                defaultValue={p.confidenceThreshold}
                disabled={saving === p.category}
                onBlur={e => updatePolicy(p.category, { confidenceThreshold: Number(e.target.value) })}
                className="w-14 bg-transparent border-b border-slate-200 py-1 outline-none focus:border-slate-900"
              />
            </td>
            <td className="py-3">
              <select
                value={p.enforcement}
                disabled={saving === p.category}
                onChange={e => updatePolicy(p.category, { enforcement: e.target.value })}
                className="bg-transparent border-b border-slate-200 py-1 outline-none focus:border-slate-900 font-medium cursor-pointer"
              >
                <option value="flag_for_review">Flag for Review</option>
                <option value="auto_block">Auto-Block</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- Appeals Queue ----------
function AppealsQueueTab() {
  const [appeals, setAppeals] = useState([]);
  const [responseText, setResponseText] = useState({});

  async function load() {
    const res = await api.get('/appeals/queue');
    setAppeals(res.data.appeals);
  }

  useEffect(() => { load(); }, []);

  async function decide(id, decision) {
    try {
      await api.patch(`/appeals/${id}`, {
        decision,
        adminResponse: responseText[id] || ''
      });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update appeal');
    }
  }

  if (appeals.length === 0) {
    return <p className="text-xs text-slate-400 italic font-light py-4">No pending appeals.</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {appeals.map(a => (
        <div key={a._id} className="py-5 first:pt-0 flex gap-4">
          <img
            src={`${API_BASE}${a.submission?.imageUrl}`}
            alt="appealed submission"
            className="w-24 h-24 object-cover rounded bg-slate-50 border border-slate-100 flex-shrink-0"
          />
          <div className="flex-1 text-xs">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-medium text-slate-700">{a.user?.name}</span>
              <span className="text-slate-400 font-light text-[11px]">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
            <span className="text-slate-400 font-light block mb-2">{a.user?.email}</span>
            <div className="mb-2">
              <span className={`font-semibold tracking-wide uppercase text-[10px] ${
                a.submission?.status === 'blocked' ? 'text-rose-600' : 'text-amber-600'
              }`}>
                {a.submission?.status}
              </span>
            </div>
            <p className="text-slate-600 font-light italic mb-3">"{a.justification}"</p>

            <textarea
              placeholder="Optional response to the user..."
              value={responseText[a._id] || ''}
              onChange={e => setResponseText(prev => ({ ...prev, [a._id]: e.target.value }))}
              rows={2}
              className="w-full text-xs p-2 bg-slate-50/50 border border-slate-100 rounded text-slate-700 placeholder-slate-400 outline-none focus:border-slate-300 resize-none mb-2"
            />
            <div className="flex gap-4">
              <button
                onClick={() => decide(a._id, 'accepted')}
                className="text-emerald-600 hover:text-emerald-800 font-semibold uppercase tracking-wider text-[10px]"
              >
                Accept
              </button>
              <button
                onClick={() => decide(a._id, 'rejected')}
                className="text-rose-500 hover:text-rose-700 font-semibold uppercase tracking-wider text-[10px]"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Analytics ----------
function AnalyticsTab() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/analytics').then(res => setData(res.data));
  }, []);

  if (!data) return <p className="text-xs text-slate-400 italic font-light py-4">Loading analytics...</p>;

  const Section = ({ title, children }) => (
    <div className="mb-8">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">{title}</h3>
      {children}
    </div>
  );

  const List = ({ items, renderLabel, renderValue }) => (
    <ul className="text-xs divide-y divide-slate-100">
      {items.map((item, i) => (
        <li key={i} className="flex justify-between py-1.5">
          <span className="text-slate-600 font-light">{renderLabel(item)}</span>
          <span className="text-slate-800 font-medium">{renderValue(item)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
      <Section title="Submission Volume Over Time">
        <List items={data.volumeOverTime} renderLabel={v => v._id} renderValue={v => v.count} />
      </Section>

      <Section title="Verdict Distribution (Outcome)">
        <List items={data.outcomeDistribution} renderLabel={o => o._id} renderValue={o => o.count} />
      </Section>

      <Section title="Verdict Distribution (Category)">
        <List items={data.categoryDistribution} renderLabel={c => c._id.replace(/_/g, ' ')} renderValue={c => c.count} />
      </Section>

      <Section title="Appeals">
        <p className="text-xs text-slate-500 font-light mb-2">
          Total {data.appeals.total} · Resolved {data.appeals.resolved} · Resolution rate {data.appeals.resolutionRate}%
        </p>
        <List items={data.appeals.outcomes} renderLabel={o => o._id} renderValue={o => o.count} />
      </Section>

      <Section title="Top Users by Submissions">
        <List
          items={data.topUsersBySubmissions}
          renderLabel={u => `${u.user.name} (${u.user.email})`}
          renderValue={u => u.count}
        />
      </Section>

      <Section title="Top Users by Violations">
        <List
          items={data.topUsersByViolations}
          renderLabel={u => `${u.user.name} (${u.user.email})`}
          renderValue={u => u.count}
        />
      </Section>
    </div>
  );
}