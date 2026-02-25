export const ShapeTriangle = ({ className = "w-1/2 h-1/2" }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className}>
    <path d="M16 4L2 28h28L16 4z" />
  </svg>
);

export const ShapeDiamond = ({ className = "w-1/2 h-1/2" }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className}>
    <path d="M16 2L2 16l14 14 14-14L16 2z" />
  </svg>
);

export const ShapeCircle = ({ className = "w-1/2 h-1/2" }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className}>
    <circle cx="16" cy="16" r="14" />
  </svg>
);

export const ShapeSquare = ({ className = "w-1/2 h-1/2" }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className}>
    <rect x="4" y="4" width="24" height="24" />
  </svg>
);

export const SHAPES = [ShapeTriangle, ShapeDiamond, ShapeCircle, ShapeSquare];
