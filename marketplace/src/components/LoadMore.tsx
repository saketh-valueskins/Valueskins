import { C } from '@/theme/colors';

interface Props {
  onLoadMore: () => void;
  loading?: boolean;
  hasMore?: boolean;
  total?: number;
  loaded?: number;
}

export default function LoadMore({ onLoadMore, loading, hasMore, total, loaded }: Props) {
  if (!hasMore) {
    if (total !== undefined && loaded !== undefined && loaded >= total) {
      return (
        <p style={{ textAlign: 'center', color: C.textSecondary, fontSize: '13px', padding: '16px 0' }}>
          Showing all {total} results
        </p>
      );
    }
    return null;
  }

  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <button
        onClick={onLoadMore}
        disabled={loading}
        style={{
          padding: '10px 32px',
          background: C.bg,
          color: C.text,
          border: `1px solid ${C.border}`,
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Loading...' : 'Load more'}
      </button>
    </div>
  );
}
