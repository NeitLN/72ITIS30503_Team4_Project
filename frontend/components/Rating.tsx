export default function Rating({
  average,
  count,
  compact = false,
}: {
  average: number;
  count: number;
  compact?: boolean;
}) {
  const rounded = Math.round(average);

  return (
    <div className={compact ? "rating rating-compact" : "rating"} aria-label={`${average.toFixed(1)} out of 5 stars`}>
      <span className="rating-stars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span className={index < rounded ? "star filled" : "star"} key={index}>★</span>
        ))}
      </span>
      <span>{count ? `${average.toFixed(1)} (${count})` : "No reviews"}</span>
    </div>
  );
}
