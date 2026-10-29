export function Skeleton({ width = '100%', height = '1rem', round = false, className = '' }: { width?: string; height?: string; round?: boolean; className?: string }) {
  return <span className={`skeleton ${round ? 'skeleton-round' : ''} ${className}`} style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="form-cards" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div className="form-card" key={i}>
          <Skeleton width="60%" height="1.2rem" />
          <Skeleton width="40%" />
          <Skeleton height="0.5rem" />
          <Skeleton height="2.75rem" className="skeleton-push" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-table" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-row" key={i}>
          <Skeleton width="30%" />
          <Skeleton width="20%" />
          <Skeleton width="25%" />
          <Skeleton width="4.5rem" height="2rem" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton width="55%" height="2.2rem" />
      <div className="skeleton-gap" />
      <Skeleton height="0.5rem" />
      <div className="card runner-card skeleton-card">
        <Skeleton width="45%" height="1.6rem" />
        <Skeleton width="25%" />
        <Skeleton height="2.9rem" />
        <Skeleton width="25%" />
        <Skeleton height="2.9rem" />
      </div>
    </div>
  );
}
