'use client';
import { withAlpha } from '@/theme/colors';
import React, { useState, useEffect, useCallback } from 'react';
import { PROFESSION_BADGES } from '@/features/valueskins/core/identity/AvatarOptions';
import { STICKER_MANIFEST } from '@/features/valueskins/core/stickers/sticker-manifest';
import { apiFetch } from '@/lib/backend';
import { useWebSocket } from '@/hooks/useWebSocket';

const C = {
  onPrimary: 'var(--c-on-primary)',
  primary: 'var(--c-primary, #0A0A0A)',
  bg: 'var(--c-bg, #ffffff)',
  surface: 'var(--c-surface, #ffffff)',
  surfaceAlt: 'var(--c-surface-alt, #f9fafb)',
  card: 'var(--c-card, #f3f4f6)',
  text: 'var(--c-text, #1f2937)',
  textSecondary: 'var(--c-text-secondary, #6b7280)',
  textMuted: 'var(--c-outline, #9ca3af)',
  border: 'var(--c-border, #e5e7eb)',
  success: 'var(--c-success, #00D46A)',
};

interface BackendCommunity {
  id: number;
  name: string;
  description: string | null;
  avatar_color: string;
  avatar_abbr: string;
  visibility: string;
  gate_type: string;
  gates: string[];
  required_tier: string;
  member_count: number;
  post_count: number;
  is_member: boolean;
  can_join: boolean;
  join_blocked_reason: string | null;
}

interface BackendPost {
  id: number;
  community_id: number;
  author_user_id: number;
  author_display_name: string;
  author_handle: string;
  author_profession: string | null;
  content: string;
  is_pinned: boolean;
  is_announcement: boolean;
  like_count: number;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getStickerForProfession(profession: string): string | undefined {
  return PROFESSION_BADGES[profession]?.stickerImage || STICKER_MANIFEST[profession];
}

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
  const [activeCommunityId, setActiveCommunityId] = useState<number | null>(null);
  const [activeDmId, setActiveDmId] = useState<number | null>(null);
  const [newCommName, setNewCommName] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [newCommVisibility, setNewCommVisibility] = useState<'public' | 'private'>('public');
  const [newCommGateType, setNewCommGateType] = useState<'any_valueskin' | 'specific'>('any_valueskin');
  const [newCommProfessions, setNewCommProfessions] = useState<string[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const { connected: wsConnected, subscribe: wsSubscribe } = useWebSocket();

  // Backend state
  const [communities, setCommunities] = useState<BackendCommunity[]>([]);
  const [posts, setPosts] = useState<BackendPost[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Local-only DMs (no backend endpoint yet)
  const [dmMessages, setDmMessages] = useState<Record<number, Array<{ id: number; sender: 'me' | 'them'; text: string; time: string }>>>({});

  // Community post input
  const [postInput, setPostInput] = useState('');

  const ownedSkins = Object.entries(valueSkins)
    .filter(([, entry]) => entry?.profession)
    .map(([, entry]) => entry!.profession);

  // Fetch communities on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch<{ communities: BackendCommunity[] }>('/communities');
        if (!cancelled && res.data?.communities) {
          setCommunities(res.data.communities);
        }
      } catch {
        // Communities not available yet
      } finally {
        if (!cancelled) setLoadingCommunities(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Fetch posts when viewing a community
  useEffect(() => {
    if (activeCommunityId === null) { setPosts([]); return; }
    let cancelled = false;
    async function loadPosts() {
      setLoadingPosts(true);
      try {
        const res = await apiFetch<{ posts: BackendPost[] }>(`/communities/${activeCommunityId}/posts`);
        if (!cancelled && res.data?.posts) {
          setPosts(res.data.posts);
        }
      } catch {
        // Posts not available
      } finally {
        if (!cancelled) setLoadingPosts(false);
      }
    }
    loadPosts();
    return () => { cancelled = true; };
  }, [activeCommunityId]);

  // Real-time community posts via WebSocket
  useEffect(() => {
    if (!wsConnected || activeCommunityId === null) return;
    const unsub = wsSubscribe('community_post', (msg) => {
      const post = msg.post as BackendPost | undefined;
      if (post && post.community_id === activeCommunityId) {
        setPosts(prev => {
          if (prev.some(p => p.id === post.id)) return prev;
          return [post, ...prev];
        });
      }
    });
    return unsub;
  }, [wsConnected, wsSubscribe, activeCommunityId]);

  // Create community
  const createCommunity = useCallback(async () => {
    if (!newCommName.trim()) return;
    try {
      const res = await apiFetch<{ community_id: number }>('/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: newCommName,
          description: newCommDesc || null,
          visibility: newCommVisibility,
          gate_type: newCommGateType,
          required_tier: newCommProfessions[0] || 'any',
          allowed_professions: newCommProfessions,
        }),
      });
      if (res.data?.community_id) {
        // Refetch communities
        const listRes = await apiFetch<{ communities: BackendCommunity[] }>('/communities');
        if (listRes.data?.communities) setCommunities(listRes.data.communities);
      }
    } catch { /* create failed */ }
    setNewCommName('');
    setNewCommDesc('');
    setMessagesTab('communities');
    setToast('Community created');
    setTimeout(() => setToast(null), 3000);
  }, [newCommName, newCommDesc, newCommVisibility, newCommGateType, newCommProfessions]);

  // Join community
  const joinCommunity = useCallback(async (communityId: number) => {
    try {
      await apiFetch(`/communities/${communityId}/join`, { method: 'POST' });
      setCommunities(prev => prev.map(c =>
        c.id === communityId ? { ...c, is_member: true, member_count: c.member_count + 1 } : c
      ));
    } catch { /* join failed */ }
  }, []);

  // Send community post
  const sendCommunityPost = useCallback(async () => {
    if (!postInput.trim() || activeCommunityId === null) return;
    try {
      const res = await apiFetch<{ post_id: number }>(`/communities/${activeCommunityId}/posts`, {
        method: 'POST',
        body: JSON.stringify({ content: postInput }),
      });
      if (res.data?.post_id) {
        // Refetch posts
        const postsRes = await apiFetch<{ posts: BackendPost[] }>(`/communities/${activeCommunityId}/posts`);
        if (postsRes.data?.posts) setPosts(postsRes.data.posts);
      }
    } catch { /* post failed */ }
    setPostInput('');
  }, [postInput, activeCommunityId]);

  const activeCommunity = communities.find(c => c.id === activeCommunityId);

  // ── DM view ────────────────────────────────────────────────────────
  if (activeDmId !== null) {
    const DM_LIST = [
      { id: 1, name: 'Alex Rivera', handle: '@alex_codes', avatar: 'AR', lastMsg: 'Hey, saw your latest post.', time: '2m', unread: true, online: true },
      { id: 2, name: 'Priya Singh', handle: '@priya_builds', avatar: 'PS', lastMsg: 'Thanks for the referral!', time: '15m', unread: true, online: false },
      { id: 3, name: 'Marcus Tran', handle: '@ml_marcus', avatar: 'MT', lastMsg: 'Sent you the architecture diagram', time: '1h', unread: false, online: true },
    ];
    const meta = DM_LIST.find(d => d.id === activeDmId);
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
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: C.textMuted, border: `1px solid ${C.border}` }}>{meta.avatar}</div>
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
          <button onClick={sendDm} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: dmInput.trim() ? C.primary : C.surfaceAlt, color: dmInput.trim() ? '#fff' : C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </>
    );
  }

  // ── Community detail view ──────────────────────────────────────────
  if (activeCommunityId !== null && activeCommunity) {
    return (
      <>
        <div style={{ height: '60px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', background: C.surface }}>
          <button onClick={() => setActiveCommunityId(null)} style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', padding: 0, display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: activeCommunity.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '11px' }}>
            {activeCommunity.avatar_abbr}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{activeCommunity.name}</span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: C.primary, background: `${withAlpha(C.primary, 0x12)}`, padding: '1px 5px', borderRadius: '4px' }}>
                {activeCommunity.gates?.[0] || 'Any Skin'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: C.textSecondary }}>{activeCommunity.member_count.toLocaleString()} members</div>
          </div>
        </div>

        {activeCommunity.description && (
          <div style={{ padding: '8px 16px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, fontSize: '11px', color: C.textSecondary }}>
            {activeCommunity.description}
          </div>
        )}

        <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loadingPosts ? (
            <div style={{ textAlign: 'center', padding: '20px', color: C.textMuted }}>Loading posts...</div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: C.textMuted }}>No posts yet. Start the conversation!</div>
          ) : (
            posts.map(post => (
              <div key={post.id} style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', minWidth: '32px', borderRadius: '50%', background: C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: C.textMuted, border: `1px solid ${C.border}` }}>
                  {post.author_display_name?.slice(0, 2).toUpperCase() || '??'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{post.author_display_name}</span>
                    {post.author_profession && (
                      <span style={{ fontSize: '9px', fontWeight: 600, color: C.primary, background: `${withAlpha(C.primary, 0x12)}`, padding: '1px 4px', borderRadius: '3px' }}>
                        {post.author_profession}
                      </span>
                    )}
                    <span style={{ fontSize: '10px', color: C.textMuted }}>{timeAgo(post.created_at)}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: C.text, lineHeight: 1.45 }}>{post.content}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: C.textMuted }}>
                      {post.like_count > 0 ? `${post.like_count} like${post.like_count > 1 ? 's' : ''}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="text" value={postInput} onChange={e => setPostInput(e.target.value)} placeholder="Post to community..."
            onKeyDown={e => { if (e.key === 'Enter') sendCommunityPost(); }}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '22px', border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: '14px', outline: 'none' }} />
          <button onClick={sendCommunityPost} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: postInput.trim() ? C.primary : C.surfaceAlt, color: postInput.trim() ? '#fff' : C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </>
    );
  }

  // ── List view (DMs / Communities / Create) ─────────────────────────
  return (
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

      {messagesTab === 'dms' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { id: 1, name: 'Alex Rivera', handle: '@alex_codes', avatar: 'AR', lastMsg: 'Hey, saw your latest post.', time: '2m', unread: true, online: true },
            { id: 2, name: 'Priya Singh', handle: '@priya_builds', avatar: 'PS', lastMsg: 'Thanks for the referral!', time: '15m', unread: true, online: false },
            { id: 3, name: 'Marcus Tran', handle: '@ml_marcus', avatar: 'MT', lastMsg: 'Sent you the architecture diagram', time: '1h', unread: false, online: true },
          ].map(dm => (
            <div key={dm.id} onClick={() => setActiveDmId(dm.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${C.border}` }}
              onMouseEnter={e => { e.currentTarget.style.background = C.surfaceAlt; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: C.textMuted, border: `1px solid ${C.border}` }}>{dm.avatar}</div>
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
          {hasValueSkin && (
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
              <button onClick={() => setMessagesTab('create')}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px dashed ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}>
                + New Community
              </button>
            </div>
          )}

          {!hasValueSkin ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}>
              <div style={{ fontSize: '13px', marginBottom: '6px' }}>Get a ValueSkin to join communities</div>
              <div style={{ fontSize: '11px' }}>Communities are gated by ValueSkin ownership</div>
            </div>
          ) : loadingCommunities ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}>Loading communities...</div>
          ) : communities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}>
              <div style={{ fontSize: '13px', marginBottom: '6px' }}>No communities yet</div>
              <div style={{ fontSize: '11px' }}>Create the first one above!</div>
            </div>
          ) : (
            communities.map(ch => (
              <div key={ch.id} onClick={() => { if (ch.is_member) setActiveCommunityId(ch.id); }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: ch.is_member ? 'pointer' : 'default', borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={e => { if (ch.is_member) e.currentTarget.style.background = C.surfaceAlt; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: ch.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '12px' }}>
                  {ch.avatar_abbr}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{ch.name}</span>
                    <span style={{ fontSize: '9px', fontWeight: 600, color: C.primary, background: `${withAlpha(C.primary, 0x12)}`, padding: '1px 5px', borderRadius: '4px' }}>
                      {ch.gates?.[0] || 'Any Skin'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: C.textMuted }}>
                    {ch.member_count.toLocaleString()} members · {ch.post_count} posts
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  {!ch.is_member && ch.can_join && (
                    <button onClick={e => { e.stopPropagation(); joinCommunity(ch.id); }}
                      style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: C.primary, color: C.onPrimary, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      Join
                    </button>
                  )}
                  {!ch.is_member && !ch.can_join && (
                    <span style={{ fontSize: '10px', color: C.textMuted }}>{ch.join_blocked_reason || 'Locked'}</span>
                  )}
                  {ch.is_member && (
                    <span style={{ fontSize: '10px', color: C.success }}>Joined</span>
                  )}
                </div>
              </div>
            ))
          )}
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
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ValueSkin Required</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button onClick={() => setNewCommGateType('any_valueskin')}
                  style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${newCommGateType === 'any_valueskin' ? C.primary : C.border}`,
                    background: newCommGateType === 'any_valueskin' ? `${withAlpha(C.primary, 0x12)}` : C.surface,
                    color: newCommGateType === 'any_valueskin' ? C.primary : C.textMuted }}>
                  Any ValueSkin
                </button>
                {ownedSkins.map(profession => (
                  <button key={profession} onClick={() => { setNewCommGateType('specific'); setNewCommProfessions([profession]); }}
                    style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${newCommGateType === 'specific' && newCommProfessions.includes(profession) ? C.primary : C.border}`,
                      background: newCommGateType === 'specific' && newCommProfessions.includes(profession) ? `${withAlpha(C.primary, 0x12)}` : C.surface,
                      color: newCommGateType === 'specific' && newCommProfessions.includes(profession) ? C.primary : C.textMuted }}>
                    {profession}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['public', 'private'] as const).map(v => (
                <button key={v} onClick={() => setNewCommVisibility(v)}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${newCommVisibility === v ? C.primary : C.border}`,
                    background: newCommVisibility === v ? `${withAlpha(C.primary, 0x10)}` : C.surface,
                    color: newCommVisibility === v ? C.primary : C.text }}>
                  {v === 'public' ? 'Public' : 'Private'}
                </button>
              ))}
            </div>
            <button onClick={createCommunity}
              style={{ width: '100%', padding: '11px', borderRadius: '8px', border: 'none', background: C.primary, color: C.onPrimary, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Create Community
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: C.primary, color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </>
  );
}
