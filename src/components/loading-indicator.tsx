export function LoadingIndicator() {
  return (
    <div className="flex min-h-[120px] items-center justify-center">
      <div className="flex items-center gap-1.5" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1 w-1 bg-foreground"
            style={{
              animation: "fade-in 0.6s ease-in-out infinite alternate",
              animationDelay: `${i * 0.15}s`,
              opacity: 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
