const dots = Array.from({ length: 3 });

export default function CartLoading() {
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-overlay__card">
        <p className="loading-overlay__label">Cargando carrito...</p>
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