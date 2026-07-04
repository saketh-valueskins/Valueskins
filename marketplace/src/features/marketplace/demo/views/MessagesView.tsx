'use client';

import React, { useState } from 'react';
import { PROFESSION_BADGES } from '@/features/valueskins/core/identity/AvatarOptions';
import { STICKER_MANIFEST } from '@/features/valueskins/core/stickers/sticker-manifest';

const C = {
  primary: '#0A0A0A',
  primaryGradient: 'linear-gradient(135deg, #0A0A0A, #2D2D2D)',
  bg: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f9fafb',
  card: '#f3f4f6',
  text: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  success: '#00D46A',
  warning: '#FFAB00',
};

const CHANNELS: {
  id: number;
  name: string;
  avatarColor: string;
  avatarAbbr: string;
  description: string;
  visibility: 'public' | 'private';
  gateType: 'any_valueskin' | 'specific';
  requiredSkin: string | null;
  allowedProfessions: string[];
  memberCount: number;
  lastMessage: { author: string; text: string; time: string };
  messages: { id: number; author: string; handle: string; text: string; time: string }[];
}[] = [
  {
    id: 0, name: 'SWE Underground', avatarColor: '#0066CC', avatarAbbr: 'SWE',
    description: 'Side projects, job referrals, and raw opinions without the LinkedIn polish.',
    visibility: 'public', gateType: 'specific', requiredSkin: 'Software Engineer',
    allowedProfessions: ['Software Engineer', 'DevOps Engineer', 'AI/ML Specialist'],
    memberCount: 2847,
    lastMessage: { author: 'Alex R.', text: 'Rust > Go for anything that matters. Fight me.', time: '2h' },
    messages: [
      { id: 0, author: 'Marcus T.', handle: '@ml_marcus', text: 'Just shipped a RAG pipeline that cut hallucination rate by 60%. Happy to share the architecture.', time: '4h ago' },
      { id: 1, author: 'Priya S.', handle: '@priya_builds', text: 'Monthly hiring board is live — drop your referral links below.', time: '3h ago' },
      { id: 2, author: 'Alex R.', handle: '@alex_codes', text: 'Rust > Go for anything that matters. Fight me.', time: '2h ago' },
    ],
  },
  {
    id: 1, name: 'MD Lounge', avatarColor: '#00897B', avatarAbbr: 'MD',
    description: 'Verified doctors and surgeons only. Clinical discussions and career advice.',
    visibility: 'private', gateType: 'specific', requiredSkin: 'Doctor',
    allowedProfessions: ['Doctor', 'Surgeon', 'Nurse'],
    memberCount: 612,
    lastMessage: { author: 'Dr. Chen', text: '34F with atypical chest pain. What would your differential be?', time: '3h' },
    messages: [
      { id: 3, author: 'Dr. Chen', handle: '@drchen', text: 'Interesting presentation today — 34F with atypical chest pain. What would your differential be?', time: '3h ago' },
      { id: 4, author: 'Dr. Williams', handle: '@drwilliams', text: 'CME webinar this Friday at 6PM EST. See you there.', time: '2d ago' },
    ],
  },
  {
    id: 2, name: 'Founders Corner', avatarColor: '#37474F', avatarAbbr: 'FC',
    description: 'Any ValueSkin gets you in. About grit, not credentials.',
    visibility: 'public', gateType: 'any_valueskin', requiredSkin: null,
    allowedProfessions: [],
    memberCount: 5241,
    lastMessage: { author: 'Lin M.', text: 'We just crossed $1M ARR. Sharing the full breakdown next week.', time: '1h' },
    messages: [
      { id: 5, author: 'Sam K.', handle: '@samk_ceo', text: 'Lesson from year 3: hire for mindset, train for skill. Churn dropped 40%.', time: '5h ago' },
      { id: 6, author: 'Lin M.', handle: '@lin_builds', text: 'We just crossed $1M ARR. Sharing the full breakdown next week. AMA.', time: '1h ago' },
    ],
  },
];

interface MessagesViewProps {
  valueSkins?: Record<string, { profession: string } | undefined | null>;
  profileName?: string;
  hasValueSkin?: boolean;
}

export default function MessagesView({
  valueSkins = {},
  profileName = 'You',
  hasValueSkin = true,
}: MessagesViewProps) {
  const [messagesTab, setMessagesTab] = useState<'dms' | 'communities' | 'create'>('dms');
  const [activeCommunity, setActiveCommunity] = useState<number | null>(null);
  const [activeDmId, setActiveDmId] = useState<number | null>(null);
  const [joinedCommunities, setJoinedCommunities] = useState<number[]>([]);
  const [newCommName, setNewCommName] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [newCommVisibility, setNewCommVisibility] = useState<'public' | 'private'>('public');
  const [newCommGateType, setNewCommGateType] = useState<'any_valueskin' | 'specific'>('any_valueskin');
  const [newCommProfessions, setNewCommProfessions] = useState<string[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null);

  const [dmMessages, setDmMessages] = useState<Record<number, Array<{ id: number; sender: 'me' | 'them'; text: string; time: string }>>>({
    1: [
      { id: 1, sender: 'them', text: 'Hey, saw your latest post. Really cool work on the API design!', time: '10:23 AM' },
      { id: 2, sender: 'me', text: 'Thanks! Spent a while getting the pagination right', time: '10:25 AM' },
      { id: 3, sender: 'them', text: 'The cursor-based approach is solid. We switched to that too last quarter', time: '10:26 AM' },
      { id: 4, sender: 'me', text: 'Yeah offset pagination just falls apart at scale', time: '10:28 AM' },
    ],
    2: [
      { id: 1, sender: 'me', text: 'Hey Priya! How did the interview go?', time: '9:15 AM' },
      { id: 2, sender: 'them', text: 'Thanks for the referral! Got the interview.', time: '9:45 AM' },
      { id: 3, sender: 'them', text: 'System design round went really well. They liked my approach to the notification service', time: '9:46 AM' },
    ],
    3: [
      { id: 1, sender: 'them', text: 'Working on a new RAG pipeline. Want to see the architecture?', time: 'Yesterday' },
      { id: 2, sender: 'me', text: 'Definitely, send it over', time: 'Yesterday' },
      { id: 3, sender: 'them', text: 'Sent you the architecture diagram', time: '11:30 AM' },
    ],
    4: [{ id: 1, sender: 'them', text: 'Can we sync on the dataset tomorrow?', time: '2:00 PM' }],
    5: [
      { id: 1, sender: 'them', text: 'Found the issue — misconfigured env var in staging', time: '8:30 AM' },
      { id: 2, sender: 'me', text: 'Nice catch. Push when ready', time: '8:45 AM' },
      { id: 3, sender: 'them', text: 'Pipeline is green now. Pushed the fix.', time: '9:00 AM' },
    ],
    6: [{ id: 1, sender: 'them', text: 'Recipe collab sounds great, let me know the details', time: 'Yesterday' }],
    7: [
      { id: 1, sender: 'them', text: 'Check out this paper on multimodal embeddings', time: '2 days ago' },
      { id: 2, sender: 'me', text: 'Looks interesting, will read tonight', time: '2 days ago' },
    ],
  });

  const [communityMessages, setCommunityMessages] = useState<Record<number, Array<{ id: number; author: string; handle: string; text: string; time: string }>>>({
    0: [
      { id: 0, author: 'Marcus T.', handle: '@ml_marcus', text: 'Just shipped a RAG pipeline that cut hallucination rate by 60%. Happy to share the architecture.', time: '4h ago' },
      { id: 1, author: 'Priya S.', handle: '@priya_builds', text: 'Monthly hiring board is live — drop your referral links below.', time: '3h ago' },
      { id: 2, author: 'Alex R.', handle: '@alex_codes', text: 'Rust > Go for anything that matters. Fight me.', time: '2h ago' },
    ],
    1: [
      { id: 3, author: 'Dr. Chen', handle: '@drchen', text: 'Interesting presentation today — 34F with atypical chest pain. What would your differential be?', time: '3h ago' },
      { id: 4, author: 'Dr. Williams', handle: '@drwilliams', text: 'CME webinar this Friday at 6PM EST. See you there.', time: '2d ago' },
    ],
    2: [
      { id: 5, author: 'Sam K.', handle: '@samk_ceo', text: 'Lesson from year 3: hire for mindset, train for skill. Churn dropped 40%.', time: '5h ago' },
      { id: 6, author: 'Lin M.', handle: '@lin_builds', text: 'We just crossed $1M ARR. Sharing the full breakdown next week. AMA.', time: '1h ago' },
    ],
  });

  const ownedSkins = Object.entries(valueSkins)
    .filter(([, entry]) => entry?.profession)
    .map(([slot, entry]) => ({ slot, profession: entry!.profession }));

  const setActiveView = () => {};

  return (
    <>
      {activeCommunity === null && activeDmId === null ? (
        <>
          <div style={{ height: '52px', display: 'flex', alignItems: 'center', paddingLeft: '16px', paddingRight: '16px', position: 'sticky', top: 0, background: C.bg, zIndex: 10 }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: C.text }}>Messages</span>
          </div>

          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
            {(['dms', 'communities'] as const).map(tab => (
              <button key={tab} onClick={() => setMessagesTab(tab)}
                style={{ flex: 1, padding: '12px 0', fontSize: '13px', fontWeight: messagesTab === tab ? 700 : 500,
                  color: messagesTab === tab ? C.text : C.textMuted, background: 'none', border: 'none',
                  borderBottom: messagesTab === tab ? `2px solid ${C.primary}` : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s' }}>
                {tab === 'dms' ? 'DMs' : 'Communities'}
              </button>
            ))}
          </div>

          <div style={{ padding: '0' }}>
            {messagesTab === 'dms' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { id: 1, name: 'Alex Rivera', handle: '@alex_codes', avatar: 'AR', lastMsg: 'Hey, saw your latest post. Really cool work on the API design!', time: '2m', unread: true, online: true },
                  { id: 2, name: 'Priya Singh', handle: '@priya_builds', avatar: 'PS', lastMsg: 'Thanks for the referral! Got the interview.', time: '15m', unread: true, online: false },
                  { id: 3, name: 'Marcus Tran', handle: '@ml_marcus', avatar: 'MT', lastMsg: 'Sent you the architecture diagram', time: '1h', unread: false, online: true },
                  { id: 4, name: 'Sarah Kim', handle: '@sarahk_data', avatar: 'SK', lastMsg: 'Can we sync on the dataset tomorrow?', time: '3h', unread: false, online: false },
                  { id: 5, name: 'Jordan Blake', handle: '@jblake_ops', avatar: 'JB', lastMsg: 'Pipeline is green now. Pushed the fix.', time: '5h', unread: false, online: false },
                  { id: 6, name: 'Elena Rodriguez', handle: '@elena_cooks', avatar: 'ER', lastMsg: 'Recipe collab sounds great, let me know the details', time: '1d', unread: false, online: false },
                  { id: 7, name: 'Tommy Nguyen', handle: '@tommy_ai', avatar: 'TN', lastMsg: 'Check out this paper on multimodal embeddings', time: '2d', unread: false, online: true },
                ].map(dm => (
                  <div key={dm.id} onClick={() => setActiveDmId(dm.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', transition: 'background 0.12s', borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.surfaceAlt; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: C.textMuted, border: `1px solid ${C.border}` }}>
                        {dm.avatar}
                      </div>
                      {dm.online && <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '12px', height: '12px', borderRadius: '50%', background: C.success, border: `2px solid ${C.bg}` }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: dm.unread ? 700 : 500, color: C.text }}>{dm.name}</span>
                        <span style={{ fontSize: '11px', color: dm.unread ? C.primary : C.textMuted }}>{dm.time}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: dm.unread ? C.text : C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: dm.unread ? 500 : 400 }}>
                        {dm.lastMsg}
                      </div>
                    </div>
                    {dm.unread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.primary, flexShrink: 0 }} />}
                  </div>
                ))}
              </div>
            )}

            {messagesTab === 'communities' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {hasValueSkin && messagesTab === 'communities' && (
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                    <button onClick={() => setMessagesTab('create')}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px dashed ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}>
                      + New Community
                    </button>
                  </div>
                )}
                {(() => {
                  const userProfessions = Object.values(valueSkins).filter(Boolean).map(s => s!.profession);
                  const matchedChannels = CHANNELS.filter(ch =>
                    ch.gateType === 'any_valueskin' ? hasValueSkin :
                    ch.allowedProfessions.some(p => userProfessions.includes(p))
                  );
                  if (!hasValueSkin) return (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}>
                      <div style={{ fontSize: '13px', marginBottom: '6px' }}>Get a ValueSkin to join communities</div>
                      <div style={{ fontSize: '11px', marginBottom: '12px' }}>Communities are DMs with a ValueSkin as the entry barrier</div>
                      <button onClick={() => setActiveView()} style={{ background: C.primary, border: 'none', borderRadius: '8px', color: '#fff', padding: '8px 20px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Go to Store</button>
                    </div>
                  );
                  if (matchedChannels.length === 0) return (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}>
                      <div style={{ fontSize: '13px', marginBottom: '6px' }}>No communities match your ValueSkins yet</div>
                      <div style={{ fontSize: '11px' }}>Communities for {userProfessions.join(', ')} will appear here</div>
                    </div>
                  );
                  return matchedChannels.map(ch => {
                    const joined = joinedCommunities.includes(ch.id);
                    return (
                      <div key={ch.id} onClick={() => { if (joined) setActiveCommunity(ch.id); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: joined ? 'pointer' : 'default', transition: 'background 0.12s', borderBottom: `1px solid ${C.border}` }}
                        onMouseEnter={e => { if (joined) e.currentTarget.style.background = C.surfaceAlt; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: ch.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '12px' }}>
                          {ch.avatarAbbr}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{ch.name}</span>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: C.primary, background: `${C.primary}12`, padding: '1px 5px', borderRadius: '4px' }}>
                              {ch.requiredSkin || 'Any Skin'}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ch.lastMessage.author}: {ch.lastMessage.text}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                          <span style={{ fontSize: '11px', color: C.textMuted }}>{ch.lastMessage.time}</span>
                          {!joined && (
                            <button onClick={e => { e.stopPropagation(); setJoinedCommunities([...joinedCommunities, ch.id]); }}
                              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: C.primary, color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                              Join
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {messagesTab === 'create' && (
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <button onClick={() => setMessagesTab('communities')} style={{ background: 'none', border: 'none', color: C.primary, fontSize: '13px', cursor: 'pointer', padding: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>New Community</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</div>
                    <input type="text" value={newCommName} onChange={e => setNewCommName(e.target.value)} placeholder="e.g. SWE Underground"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: '13px', boxSizing: 'border-box' as const }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</div>
                    <textarea value={newCommDesc} onChange={e => setNewCommDesc(e.target.value)} placeholder="What is this community about?" rows={2}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: '13px', boxSizing: 'border-box' as const, fontFamily: 'inherit', resize: 'none' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ValueSkin Required to Join</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => setNewCommGateType('any_valueskin')}
                        style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          border: `1px solid ${newCommGateType === 'any_valueskin' ? C.primary : C.border}`,
                          background: newCommGateType === 'any_valueskin' ? `${C.primary}12` : C.surface,
                          color: newCommGateType === 'any_valueskin' ? C.primary : C.textMuted }}>
                        Any ValueSkin
                      </button>
                      {ownedSkins.map(({ profession }) => (
                        <button key={profession} onClick={() => { setNewCommGateType('specific'); setNewCommProfessions([profession]); }}
                          style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                            border: `1px solid ${newCommGateType === 'specific' && newCommProfessions.includes(profession) ? C.primary : C.border}`,
                            background: newCommGateType === 'specific' && newCommProfessions.includes(profession) ? `${C.primary}12` : C.surface,
                            color: newCommGateType === 'specific' && newCommProfessions.includes(profession) ? C.primary : C.textMuted }}>
                          {profession}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: '10px', color: C.textSecondary, marginTop: '6px' }}>Only people with this ValueSkin can join</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['public', 'private'] as const).map(v => (
                      <button key={v} onClick={() => setNewCommVisibility(v)}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          border: `1px solid ${newCommVisibility === v ? C.primary : C.border}`,
                          background: newCommVisibility === v ? `${C.primary}10` : C.surface,
                          color: newCommVisibility === v ? C.primary : C.text }}>
                        {v === 'public' ? 'Public' : 'Private'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => {
                    if (newCommName.trim()) {
                      setJoinedCommunities([...joinedCommunities, CHANNELS.length + joinedCommunities.length]);
                      setNewCommName(''); setNewCommDesc('');
                      setMessagesTab('communities');
                      setPurchaseToast('Community created');
                      setTimeout(() => setPurchaseToast(null), 3000);
                    }
                  }} style={{ width: '100%', padding: '11px', borderRadius: '8px', border: 'none', background: C.primary, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Create Community
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : activeDmId !== null ? (
        <>
          {(() => {
            const dmMeta: Record<number, { name: string; handle: string; avatar: string; online: boolean }> = {
              1: { name: 'Alex Rivera', handle: '@alex_codes', avatar: 'AR', online: true },
              2: { name: 'Priya Singh', handle: '@priya_builds', avatar: 'PS', online: false },
              3: { name: 'Marcus Tran', handle: '@ml_marcus', avatar: 'MT', online: true },
              4: { name: 'Sarah Kim', handle: '@sarahk_data', avatar: 'SK', online: false },
              5: { name: 'Jordan Blake', handle: '@jblake_ops', avatar: 'JB', online: false },
              6: { name: 'Elena Rodriguez', handle: '@elena_cooks', avatar: 'ER', online: false },
              7: { name: 'Tommy Nguyen', handle: '@tommy_ai', avatar: 'TN', online: true },
            };
            const meta = dmMeta[activeDmId];
            const msgs = dmMessages[activeDmId] || [];
            if (!meta) return null;
            const sendDm = () => {
              if (!dmInput.trim()) return;
              const now = new Date();
              const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              const newMsg = { id: Date.now(), sender: 'me' as const, text: dmInput, time: timeStr };
              setDmMessages(prev => ({ ...prev, [activeDmId!]: [...(prev[activeDmId!] || []), newMsg] }));
              setDmInput('');
            };
            return (
              <>
                <div style={{ height: '60px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', background: C.surface }}>
                  <button onClick={() => setActiveDmId(null)} style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', padding: 0, display: 'flex' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: C.textMuted, border: `1px solid ${C.border}` }}>
                      {meta.avatar}
                    </div>
                    {meta.online && <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', background: C.success, border: `2px solid ${C.surface}` }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{meta.name}</div>
                    <div style={{ fontSize: '11px', color: meta.online ? C.success : C.textMuted }}>{meta.online ? 'Active now' : meta.handle}</div>
                  </div>
                </div>

                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {msgs.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'me' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '75%', padding: '10px 14px', borderRadius: msg.sender === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: msg.sender === 'me' ? C.primary : C.card,
                        color: msg.sender === 'me' ? '#fff' : C.text,
                        fontSize: '14px', lineHeight: 1.4,
                        border: msg.sender === 'me' ? 'none' : `1px solid ${C.border}`,
                      }}>
                        <div>{msg.text}</div>
                        <div style={{ fontSize: '10px', color: msg.sender === 'me' ? 'rgba(255,255,255,0.6)' : C.textMuted, marginTop: '4px', textAlign: 'right' }}>{msg.time}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="text" value={dmInput} onChange={e => setDmInput(e.target.value)} placeholder="Message..."
                    onKeyDown={e => { if (e.key === 'Enter') sendDm(); }}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '22px', border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: '14px', outline: 'none' }} />
                  <button onClick={sendDm} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: dmInput.trim() ? C.primary : C.surfaceAlt, color: dmInput.trim() ? '#fff' : C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
              </>
            );
          })()}
        </>
      ) : (
        <>
          {(() => {
            const channel = CHANNELS.find(c => c.id === activeCommunity);
            if (!channel) return null;
            return (
              <>
                <div style={{ height: '60px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', background: C.surface }}>
                  <button onClick={() => setActiveCommunity(null)} style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', padding: 0, display: 'flex' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: channel.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '11px' }}>
                    {channel.avatarAbbr}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{channel.name}</span>
                      <span style={{ fontSize: '9px', fontWeight: 600, color: C.primary, background: `${C.primary}12`, padding: '1px 5px', borderRadius: '4px' }}>{channel.requiredSkin || 'Any Skin'}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: C.textSecondary }}>{channel.memberCount.toLocaleString()} members</div>
                  </div>
                </div>

                <div style={{ padding: '8px 16px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, fontSize: '11px', color: C.textSecondary }}>
                  {channel.description}
                </div>

                <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(communityMessages[channel.id] || channel.messages).map(msg => (
                    <div key={msg.id} style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', minWidth: '32px', borderRadius: '50%', background: C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: C.textMuted, border: `1px solid ${C.border}` }}>
                        {msg.author.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{msg.author}</span>
                          <span style={{ fontSize: '10px', color: C.textMuted }}>{msg.time}</span>
                        </div>
                        <div style={{ fontSize: '14px', color: C.text, lineHeight: 1.45 }}>{msg.text}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {(() => {
                  const sendCommunityMsg = () => {
                    if (!dmInput.trim()) return;
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    const newMsg = { id: Date.now(), author: profileName, handle: '@you', text: dmInput, time: timeStr };
                    setCommunityMessages(prev => ({
                      ...prev,
                      [channel.id]: [...(prev[channel.id] || channel.messages), newMsg],
                    }));
                    setDmInput('');
                  };
                  return (
                    <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="text" value={dmInput} onChange={e => setDmInput(e.target.value)} placeholder="Message..."
                        onKeyDown={e => { if (e.key === 'Enter') sendCommunityMsg(); }}
                        style={{ flex: 1, padding: '10px 14px', borderRadius: '22px', border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: '14px', outline: 'none' }} />
                      <button onClick={sendCommunityMsg} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: dmInput.trim() ? C.primary : C.surfaceAlt, color: dmInput.trim() ? '#fff' : C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      </button>
                    </div>
                  );
                })()}
              </>
            );
          })()}
        </>
      )}
    </>
  );
}
