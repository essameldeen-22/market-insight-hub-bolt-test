import type { ReactNode } from "react";

// Shared lightweight card wrapper matching the existing CSS card styles.
export function Card({
  title,
  children,
  right,
}: {
  title?: ReactNode;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="card">
      {(title || right) && (
        <div className="card-header">
          {title && <div className="card-title">{title}</div>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
