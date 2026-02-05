import React from 'react';
import './skeleton.css';

export default function Skeleton({ rows = 6, cols = 6 }) {
  const arr = Array.from({ length: rows });
  return (
    <div className="skeleton">
      {arr.map((_, i) => (
        <div className="skeleton-row" key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <div className="skeleton-cell" key={j} />
          ))}
        </div>
      ))}
    </div>
  );
}
