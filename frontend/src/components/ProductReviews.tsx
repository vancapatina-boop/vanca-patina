import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import {
  BadgeCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  FileVideo,
  Loader2,
  PlayCircle,
  Star,
  ThumbsUp,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import ProductRating from "@/components/ProductRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { BACKEND_ORIGIN } from "@/lib/apiConfig";
import api from "@/services/api";

type ReviewUser = {
  name?: string;
};

type Review = {
  _id: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  video?: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  customerName?: string;
  userId?: ReviewUser;
  adminReply?: {
    body?: string;
    repliedAt?: string;
  };
};

type ReviewSummary = {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
};

type UploadedPreview = {
  file: File;
  url: string;
};

const sortOptions = [
  { value: "helpful", label: "Most Helpful" },
  { value: "newest", label: "Newest" },
  { value: "highest", label: "Highest Rating" },
  { value: "lowest", label: "Lowest Rating" },
  { value: "photos", label: "With Photos" },
  { value: "verified", label: "Verified Purchase" },
];

const emptySummary: ReviewSummary = {
  averageRating: 0,
  totalReviews: 0,
  distribution: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 },
};

const normalizeAssetUrl = (url?: string) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/uploads/")) return `${BACKEND_ORIGIN}${url}`;
  return url;
};

const formatReviewDate = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getReviewerName = (review: Review) => review.customerName || review.userId?.name || "Customer";

const StarInput = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
  const [hoverValue, setHoverValue] = useState(0);
  const activeValue = hoverValue || value;

  const setRatingFromKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>, rating: number) => {
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      onChange(rating);
    }

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(Math.min(5, value + 1 || 1));
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange(Math.max(1, value - 1));
    }
  };

  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Select review rating">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          role="radio"
          aria-checked={value === rating}
          onClick={() => onChange(rating)}
          onKeyDown={(event) => setRatingFromKeyboard(event, rating)}
          onPointerEnter={() => setHoverValue(rating)}
          onPointerLeave={() => setHoverValue(0)}
          className="group rounded-full p-1 text-zinc-500 outline-none transition-transform duration-200 hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
        >
          <Star
            className={`h-8 w-8 transition-all duration-200 ${
              rating <= activeValue
                ? "fill-primary text-primary drop-shadow-[0_0_12px_rgba(212,175,55,0.35)]"
                : "text-zinc-600 group-hover:text-primary/70"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground min-w-24">
        {value > 0 ? `${value} out of 5` : "Tap to rate"}
      </span>
    </div>
  );
};

const ProductReviews = ({
  productId,
  onRatingChange,
}: {
  productId: string;
  onRatingChange?: (rating: number, count: number) => void;
}) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>(emptySummary);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [sortBy, setSortBy] = useState("helpful");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [imagePreviews, setImagePreviews] = useState<UploadedPreview[]>([]);
  const [videoPreview, setVideoPreview] = useState<UploadedPreview | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const imagePreviewRef = useRef<UploadedPreview[]>([]);
  const videoPreviewRef = useRef<UploadedPreview | null>(null);

  useEffect(() => {
    imagePreviewRef.current = imagePreviews;
  }, [imagePreviews]);

  useEffect(() => {
    videoPreviewRef.current = videoPreview;
  }, [videoPreview]);

  useEffect(() => {
    if (user?.name && !customerName) setCustomerName(user.name);
    if (user?.email && !customerEmail) setCustomerEmail(user.email);
  }, [customerEmail, customerName, user]);

  useEffect(() => {
    return () => {
      imagePreviewRef.current.forEach((item) => URL.revokeObjectURL(item.url));
      if (videoPreviewRef.current) URL.revokeObjectURL(videoPreviewRef.current.url);
    };
  }, []);

  const galleryImages = useMemo(
    () => reviews.flatMap((review) => (review.images || []).map((url) => normalizeAssetUrl(url))).filter(Boolean),
    [reviews],
  );

  const onRatingChangeRef = useRef(onRatingChange);

  useEffect(() => {
    onRatingChangeRef.current = onRatingChange;
  }, [onRatingChange]);

  const fetchReviews = useCallback(
    async (nextPage = 1, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params: Record<string, string | number> = { page: nextPage, limit: 10, sortBy };
        if (sortBy === "photos") params.withPhotos = "true";
        if (sortBy === "verified") params.verified = "true";

        const res = await api.get(`/products/${productId}/reviews`, { params });
        const nextReviews = Array.isArray(res.data?.reviews) ? res.data.reviews : [];
        const nextSummary = res.data?.summary || emptySummary;
        setReviews((current) => (append ? [...current, ...nextReviews] : nextReviews));
        setSummary(nextSummary);
        setPage(Number(res.data?.page || nextPage));
        setPages(Number(res.data?.pages || 1));
        onRatingChangeRef.current?.(Number(nextSummary.averageRating || 0), Number(nextSummary.totalReviews || 0));
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, "Failed to load reviews"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [productId, sortBy],
  );

  useEffect(() => {
    fetchReviews(1, false);
  }, [fetchReviews]);

  const resetForm = () => {
    imagePreviews.forEach((item) => URL.revokeObjectURL(item.url));
    if (videoPreview) URL.revokeObjectURL(videoPreview.url);
    setFormRating(0);
    if (!user?.name) setCustomerName("");
    if (!user?.email) setCustomerEmail("");
    setTitle("");
    setComment("");
    setImagePreviews([]);
    setVideoPreview(null);
    setUploadProgress(0);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    const validFiles = selectedFiles.filter((file) => ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type));
    if (validFiles.length !== selectedFiles.length) {
      toast.error("Only JPG, PNG, and WebP images are supported");
    }

    const availableSlots = Math.max(0, 5 - imagePreviews.length);
    if (validFiles.length > availableSlots) {
      toast.error("You can upload up to 5 images");
    }

    const nextItems = validFiles.slice(0, availableSlots).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setImagePreviews((current) => [...current, ...nextItems]);
    event.target.value = "";
  };

  const removeImage = (index: number) => {
    setImagePreviews((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
      toast.error("Only MP4, MOV, and WebM videos are supported");
      event.target.value = "";
      return;
    }

    if (videoPreview) URL.revokeObjectURL(videoPreview.url);
    setVideoPreview({ file, url: URL.createObjectURL(file) });
    event.target.value = "";
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview.url);
    setVideoPreview(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (formRating < 1 || !customerName.trim() || !customerEmail.trim() || !title.trim() || comment.trim().length < 10) {
      toast.error("Add your name, email, rating, title, and a detailed review");
      return;
    }

    const formData = new FormData();
    formData.append("rating", String(formRating));
    formData.append("customerName", customerName.trim());
    formData.append("customerEmail", customerEmail.trim());
    formData.append("title", title.trim());
    formData.append("comment", comment.trim());
    imagePreviews.forEach(({ file }) => formData.append("images", file));
    if (videoPreview) formData.append("video", videoPreview.file);

    setSubmitting(true);
    setUploadProgress(0);
    try {
      await api.post(`/products/${productId}/reviews`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        },
      });
      toast.success("Review submitted successfully");
      resetForm();
      await fetchReviews(1, false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to submit review"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    try {
      const res = await api.patch(`/products/${productId}/reviews/${reviewId}/helpful`);
      setReviews((current) =>
        current.map((review) =>
          review._id === reviewId ? { ...review, helpfulCount: Number(res.data?.helpfulCount || review.helpfulCount + 1) } : review,
        ),
      );
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Could not mark this review helpful"));
    }
  };

  const handleReport = async (reviewId: string) => {
    try {
      await api.post(`/products/${productId}/reviews/${reviewId}/report`);
      toast.success("Review reported");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Could not report this review"));
    }
  };

  const totalReviews = summary.totalReviews || 0;
  const activeLightboxImage = lightboxIndex !== null ? galleryImages[lightboxIndex] : "";

  return (
    <section className="mt-24" id="customer-reviews">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <p className="text-primary font-medium text-sm tracking-widest uppercase mb-2">Customer Voice</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">Customer Reviews</h2>
        </div>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="w-full md:w-60 px-4 py-3 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[390px_1fr] gap-8 items-start">
        <div className="space-y-6 xl:sticky xl:top-28">
          <div className="glass-card p-6 shadow-2xl shadow-black/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Overall Rating</p>
                <ProductRating rating={summary.averageRating} count={summary.totalReviews} size="lg" showText={false} />
              </div>
              <div className="text-right">
                <p className="text-5xl font-bold text-foreground leading-none">{summary.averageRating ? summary.averageRating.toFixed(1) : "0.0"}</p>
                <p className="text-xs text-muted-foreground mt-2">out of 5</p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-border/70 bg-black/10 px-4 py-3">
              <p className="text-sm text-foreground">
                {totalReviews > 0 ? `Based on ${totalReviews} Review${totalReviews === 1 ? "" : "s"}` : "No Reviews Yet"}
              </p>
              {totalReviews === 0 && <p className="text-xs text-muted-foreground mt-1">Be the first to review this product.</p>}
            </div>

            <div className="space-y-3 mt-6">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = Number(summary.distribution[String(rating)] || 0);
                const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={rating} className="grid grid-cols-[78px_1fr_34px] items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-primary">
                      <span className="text-xs text-muted-foreground w-2">{rating}</span>
                      <Star className="w-3.5 h-3.5 fill-primary" />
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full gradient-copper rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${percent}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-muted-foreground text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-6 shadow-2xl shadow-black/20">
            <div className="mb-5">
              <h3 className="font-display text-2xl font-semibold text-foreground">Write a Review</h3>
              <p className="text-sm text-muted-foreground mt-1">Share your product experience with other customers.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">Your Rating</label>
                <StarInput value={formRating} onChange={setFormRating} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">Name</label>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    maxLength={100}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-lg bg-secondary/80 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    maxLength={254}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-lg bg-secondary/80 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">Review Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  placeholder="Sum up your experience"
                  className="w-full px-4 py-3 rounded-lg bg-secondary/80 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">Detailed Review</label>
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={3000}
                  placeholder="What did you like? How was the finish, packaging, and application?"
                  className="min-h-32 bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/60 px-4 py-4 text-sm text-muted-foreground hover:border-primary/70 hover:text-foreground transition-colors">
                  <Camera className="w-4 h-4" />
                  Add Photos ({imagePreviews.length}/5)
                  <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple className="hidden" onChange={handleImageChange} />
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/60 px-4 py-4 text-sm text-muted-foreground hover:border-primary/70 hover:text-foreground transition-colors">
                  <FileVideo className="w-4 h-4" />
                  {videoPreview ? "Change Video" : "Add Video"}
                  <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoChange} />
                </label>
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {imagePreviews.map((item, index) => (
                    <div key={item.url} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary">
                      <img src={item.url} alt={`Selected review upload ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black transition-colors"
                        aria-label="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {videoPreview && (
                <div className="rounded-lg border border-border bg-secondary/60 p-3">
                  <div className="flex gap-3">
                    <video src={videoPreview.url} className="h-20 w-28 rounded-md bg-black object-cover" preload="metadata" muted />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <PlayCircle className="w-4 h-4 text-primary" />
                        <span className="truncate">{videoPreview.file.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{formatFileSize(videoPreview.file.size)}</p>
                      <button type="button" onClick={removeVideo} className="mt-3 inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80">
                        <Trash2 className="w-3.5 h-3.5" /> Remove video
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {submitting && uploadProgress > 0 && (
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full gradient-copper transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full gradient-copper text-primary-foreground font-semibold hover-glow h-12">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {submitting ? "Submitting Review..." : "Submit Review"}
              </Button>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="glass-card p-10 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <ProductRating rating={0} count={0} size="lg" showText={false} className="justify-center" />
              <h3 className="font-display text-2xl font-semibold text-foreground mt-4">No Reviews Yet</h3>
              <p className="text-sm text-muted-foreground mt-2">Be the first to review this product.</p>
            </div>
          ) : (
            reviews.map((review) => {
              const reviewerName = getReviewerName(review);
              return (
                <motion.article
                  key={review._id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="glass-card p-5 shadow-xl shadow-black/10 hover:shadow-primary/10 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-full gradient-copper flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/10">
                        {reviewerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{reviewerName}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {review.verifiedPurchase && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-patina">
                              <BadgeCheck className="w-3 h-3" /> Verified Purchase
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{formatReviewDate(review.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <ProductRating rating={review.rating} count={0} size="sm" showText={false} />
                  </div>

                  <h3 className="font-display text-lg font-semibold text-foreground mt-4">{review.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">{review.comment}</p>

                  {review.images?.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-4">
                      {review.images.map((imageUrl, index) => {
                        const normalized = normalizeAssetUrl(imageUrl);
                        const globalIndex = galleryImages.indexOf(normalized);
                        return (
                          <button
                            key={`${review._id}-${imageUrl}`}
                            type="button"
                            onClick={() => setLightboxIndex(globalIndex >= 0 ? globalIndex : 0)}
                            className="aspect-square rounded-lg overflow-hidden border border-border bg-secondary group"
                          >
                            <img
                              src={normalized}
                              alt={`${review.title} review image ${index + 1}`}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {review.video && (
                    <video controls preload="metadata" className="mt-4 w-full max-h-80 rounded-lg border border-border bg-black">
                      <source src={normalizeAssetUrl(review.video)} />
                    </video>
                  )}

                  {review.adminReply?.body && (
                    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <p className="text-sm font-medium text-primary">Vanca Patina replied</p>
                      <p className="text-sm text-muted-foreground mt-1">{review.adminReply.body}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border/60">
                    <button type="button" onClick={() => handleHelpful(review._id)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <ThumbsUp className="w-3.5 h-3.5" /> Helpful ({review.helpfulCount || 0})
                    </button>
                    <button type="button" onClick={() => handleReport(review._id)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                      Report
                    </button>
                  </div>
                </motion.article>
              );
            })
          )}

          {!loading && page < pages && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" disabled={loadingMore} onClick={() => fetchReviews(page + 1, true)} className="border-border bg-secondary text-foreground hover:bg-secondary/80">
                {loadingMore ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Load More
              </Button>
            </div>
          )}
        </div>
      </div>

      {activeLightboxImage && lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => {
              setLightboxIndex(null);
              setZoomed(false);
            }}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close review image"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setLightboxIndex((current) => (current === null ? 0 : Math.max(0, current - 1)))}
            disabled={lightboxIndex === 0}
            className="absolute left-4 md:left-8 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 transition-colors"
            aria-label="Previous review image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button type="button" onClick={() => setZoomed((current) => !current)} className="max-w-[90vw] max-h-[85vh] overflow-auto" aria-label="Zoom review image">
            <img
              src={activeLightboxImage}
              alt="Customer review gallery"
              className={`mx-auto rounded-lg transition-transform duration-300 ${zoomed ? "scale-125 cursor-zoom-out" : "scale-100 cursor-zoom-in"} max-h-[82vh]`}
            />
          </button>
          <button
            type="button"
            onClick={() => setLightboxIndex((current) => (current === null ? 0 : Math.min(galleryImages.length - 1, current + 1)))}
            disabled={lightboxIndex >= galleryImages.length - 1}
            className="absolute right-4 md:right-8 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 transition-colors"
            aria-label="Next review image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </section>
  );
};

export default ProductReviews;
