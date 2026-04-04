const dots = Array.from({ length: 3 });

export default function TrackingLoading() {
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-overlay__card">
        <p className="loading-overlay__label">Cargando tracking...</p>
        <div className="loading-overlay__dots" aria-hidden="true">
          {dots.map((_, index) => (
            <span
              key={index}
              className="loading-overlay__dot"
              style={{ animationDelay: `${index * 0.14}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}