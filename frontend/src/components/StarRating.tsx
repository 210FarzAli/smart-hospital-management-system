import { StarIcon } from "./icons/Icons";

export default function StarRating({ rating, showNumber = true, size = "sm" }: { rating: number; showNumber?: boolean; size?: "sm" | "md" | "lg" }) {
  const rounded = Math.round((rating || 0) * 2) / 2;
  const iconSize = size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

  return (
    <div className="inline-flex items-center gap-1.5" aria-label={`${rating} out of 5 stars`}>
      <div className="flex items-center gap-0.5 text-amber-500">
        {[1, 2, 3, 4, 5].map((n) => {
          const isFilled = n <= Math.floor(rounded);
          const isHalf = !isFilled && n - 0.5 <= rounded;
          return (
            <StarIcon
              key={n}
              className={`${iconSize} ${isFilled || isHalf ? "text-amber-500 fill-amber-500" : "text-slate-200 fill-slate-100"}`}
            />
          );
        })}
      </div>
      {showNumber && (
        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200/50">
          {(rating || 0).toFixed(1)}
        </span>
      )}
    </div>
  );
}
