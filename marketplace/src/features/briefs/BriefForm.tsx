'use client';
import { useState } from 'react';

const C = {
  bg: '#0f172a', surface: '#1e293b', surfaceAlt: '#334155',
  text: '#f8fafc', textMuted: '#94a3b8', primary: '#38bdf8',
  success: '#10b981', border: '#334155',
};

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'twitter', label: 'Twitter/X' },
  { id: 'linkedin', label: 'LinkedIn' },
];

const CONTENT_TYPES = ['photo', 'video', 'story', 'live', 'carousel', 'text'];

export default function BriefForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({
    title: '', description: '', campaign_goals: '', target_audience: '',
    budget_range: '', required_niches: [] as string[], required_platforms: [] as string[],
    required_content_types: [] as string[], deadline: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [nicheInput, setNicheInput] = useState('');

  const addNiche = () => {
    if (nicheInput.trim() && !form.required_niches.includes(nicheInput.trim())) {
      setForm({ ...form, required_niches: [...form.required_niches, nicheInput.trim()] });
      setNicheInput('');
    }
  };

  const togglePlatform = (pid: string) => {
    setForm({ ...form, required_platforms: form.required_platforms.includes(pid) ? form.required_platforms.filter(p => p !== pid) : [...form.required_platforms, pid] });
  };

  const toggleContent = (ct: string) => {
    setForm({ ...form, required_content_types: form.required_content_types.includes(ct) ? form.required_content_types.filter(c => c !== ct) : [...form.required_content_types, ct] });
  };

  const handleSave = async () => {
    if (!form.title || form.title.length < 3) { setMessage('Title must be at least 3 characters'); return; }
    if (!form.description || form.description.length < 20) { setMessage('Description must be at least 20 characters'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/briefs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...form, deadline: form.deadline || null }),
      });
      if (res.ok) { setMessage('Brief created!'); setForm({ title: '', description: '', campaign_goals: '', target_audience: '', budget_range: '', required_niches: [], required_platforms: [], required_content_types: [], deadline: '' }); onSaved(); }
      else { const d = await res.json(); setMessage(d.error || 'Failed'); }
    } catch (err: any) { setMessage(err.message); }
    finally { setSaving(false); setTimeout(() => setMessage(''), 3000); }
  };

  return (
    <div style={{ color: C.text, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Create a Brief</h2>
      <p style={{ fontSize: '13px', color: C.textMuted, marginBottom: '16px' }}>Describe what you're looking for. We'll match you with relevant creators.</p>

      {message && <div style={{ padding: '8px 12px', background: `${C.success}20`, borderRadius: '6px', fontSize: '12px', color: C.success, marginBottom: '12px' }}>{message}</div>}

      <div style={{ display: 'grid', gap: '12px' }}>
        <input placeholder="Brief title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
          style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }} />

        <textarea placeholder="Describe your campaign, goals, and what you need from creators *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px', minHeight: '80px' }} />

        <textarea placeholder="Campaign goals (e.g., increase brand awareness, drive sales)" value={form.campaign_goals} onChange={e => setForm({ ...form, campaign_goals: e.target.value })}
          style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px', minHeight: '60px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <input placeholder="Target audience (e.g., women 18-35, gamers)" value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })}
            style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }} />
          <input placeholder="Budget range (e.g., 1000-5000)" value={form.budget_range} onChange={e => setForm({ ...form, budget_range: e.target.value })}
            style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }} />
        </div>

        <div>
          <label style={{ fontSize: '12px', color: C.textMuted, marginBottom: '6px', display: 'block' }}>Required Niches (press Enter to add)</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
            {form.required_niches.map(n => <span key={n} style={{ padding: '4px 8px', background: `${C.primary}20`, borderRadius: '4px', fontSize: '12px', color: C.primary }}>{n} <span onClick={() => setForm({ ...form, required_niches: form.required_niches.filter(x => x !== n) })} style={{ cursor: 'pointer', marginLeft: '4px' }}>x</span></span>)}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input placeholder="e.g., Fashion, Tech, Fitness" value={nicheInput} onChange={e => setNicheInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNiche())}
              style={{ flex: 1, padding: '8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '13px' }} />
            <button onClick={addNiche} style={{ padding: '8px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, cursor: 'pointer', fontSize: '13px' }}>Add</button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: C.textMuted, marginBottom: '6px', display: 'block' }}>Required Platforms</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => togglePlatform(p.id)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${form.required_platforms.includes(p.id) ? C.primary : C.border}`, background: form.required_platforms.includes(p.id) ? `${C.primary}20` : 'transparent', color: form.required_platforms.includes(p.id) ? C.primary : C.textMuted, cursor: 'pointer', fontSize: '13px' }}>{p.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: C.textMuted, marginBottom: '6px', display: 'block' }}>Content Types</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {CONTENT_TYPES.map(ct => (
              <button key={ct} onClick={() => toggleContent(ct)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${form.required_content_types.includes(ct) ? C.primary : C.border}`, background: form.required_content_types.includes(ct) ? `${C.primary}20` : 'transparent', color: form.required_content_types.includes(ct) ? C.primary : C.textMuted, cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize' }}>{ct}</button>
            ))}
          </div>
        </div>

        <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
          style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }} />

        <button onClick={handleSave} disabled={saving}
          style={{ padding: '10px', background: C.primary, color: '#000', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1, fontSize: '14px' }}>
          {saving ? 'Saving...' : 'Create Brief'}
        </button>
      </div>
    </div>
  );
}
