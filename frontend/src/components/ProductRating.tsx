import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductRatingProps = {
  rating: number;
  count: number;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

const textClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

const formatRating = (rating: number) => {
  const safeRating = Number.isFinite(rating) ? rating : 0;
  return safeRating > 0 ? safeRating.toFixed(1) : "0.0";
};

const ProductRating = ({ rating, count, size = "md", showText = true, className }: ProductRatingProps) => {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const safeCount = Math.max(0, Number(count) || 0);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-0.5" aria-label={`${formatRating(safeRating)} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => {
          const fillPercent = Math.max(0, Math.min(1, safeRating - (star - 1))) * 100;
          return (
            <span key={star} className={cn("relative inline-flex shrink-0", sizeClasses[size])}>
              <Star className={cn("absolute inset-0 text-muted", sizeClasses[size])} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
                <Star className={cn("fill-primary text-primary", sizeClasses[size])} />
              </span>
            </span>
          );
        })}
      </div>
      {showText && (
        <span className={cn("text-muted-foreground", textClasses[size])}>
          {safeCount > 0 ? `${formatRating(safeRating)} (${safeCount} Review${safeCount === 1 ? "" : "s"})` : "No Reviews Yet"}
        </span>
      )}
    </div>
  );
};

export default ProductRating;
