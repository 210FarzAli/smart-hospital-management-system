import { FormEvent, useEffect, useState } from "react";
import { reviewsApi, HospitalReview } from "../../lib/apiClient";
import StarRating from "../../components/StarRating";
import {
  Star,
  CheckCircle,
  ShieldCheck,
  User,
  Plus,
  Send,
  AlertCircle,
  Clock,
} from "../../components/icons/Icons";

export default function Reviews() {
  const [reviews, setReviews] = useState<HospitalReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null);

  // Review submission state
  const [showModal, setShowModal] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const loadReviews = () => {
    setLoading(true);
    reviewsApi
      .list()
      .then((res) => {
        setReviews(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReviews();
  }, []);

  async function handleSubmitReview(e: FormEvent) {
    e.preventDefault();
    if (!reviewerName.trim()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      await reviewsApi.create({
        reviewer_name: reviewerName.trim(),
        rating,
        comment: comment.trim() || undefined,
        is_verified_patient: true,
      });

      setSubmitSuccess(true);
      setReviewerName("");
      setComment("");
      setRating(5);
      loadReviews();

      setTimeout(() => {
        setSubmitSuccess(false);
        setShowModal(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Calculate statistics
  const totalCount = reviews.length;
  const avgRating =
    totalCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount
      : 5.0;

  const filteredReviews = selectedRatingFilter
    ? reviews.filter((r) => r.rating === selectedRatingFilter)
    : reviews;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-8 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Patient Experiences
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-teal-950 sm:text-4xl">
              Patient Feedback & Reviews
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Transparent experiences from patients and families who trust Smart Hospital with their healthcare.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn-primary inline-flex items-center gap-2 self-start shadow-md shadow-teal-900/10 sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Share Your Experience
          </button>
        </div>

        {/* Aggregate Ratings Overview */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card flex flex-col items-center justify-center p-6 text-center">
            <div className="text-5xl font-extrabold text-teal-950">
              {avgRating.toFixed(1)}
            </div>
            <div className="mt-2">
              <StarRating rating={Math.round(avgRating)} />
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Based on {totalCount} verified patient ratings
            </p>
          </div>

          <div className="card flex flex-col justify-center p-6 md:col-span-2">
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = reviews.filter((r) => r.rating === stars).length;
                const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
                const isSelected = selectedRatingFilter === stars;

                return (
                  <button
                    key={stars}
                    type="button"
                    onClick={() =>
                      setSelectedRatingFilter(isSelected ? null : stars)
                    }
                    className={`flex w-full items-center gap-3 rounded-lg p-1 text-xs transition-colors hover:bg-slate-50 ${
                      isSelected ? "bg-teal-50 font-semibold" : ""
                    }`}
                  >
                    <span className="flex w-14 items-center gap-1 font-medium text-slate-700">
                      {stars} <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-slate-400">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        {selectedRatingFilter && (
          <div className="mt-6 flex items-center justify-between rounded-xl bg-teal-50/60 px-4 py-2 text-xs text-teal-950">
            <span>
              Showing only <strong>{selectedRatingFilter}-star</strong> reviews
            </span>
            <button
              onClick={() => setSelectedRatingFilter(null)}
              className="font-semibold text-teal-800 underline hover:text-teal-950"
            >
              Show all reviews
            </button>
          </div>
        )}

        {/* Reviews List */}
        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-teal-700 border-t-transparent" />
              <p className="mt-2 text-sm text-slate-500">Loading patient feedback...</p>
            </div>
          ) : filteredReviews.length > 0 ? (
            filteredReviews.map((r) => (
              <div
                key={r.id}
                className="card p-6 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100/70 font-bold text-teal-900">
                      {r.reviewer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-teal-950">
                          {r.reviewer_name}
                        </span>
                        {r.is_verified_patient && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 ring-1 ring-teal-200">
                            <CheckCircle className="h-3 w-3" />
                            Verified Patient
                          </span>
                        )}
                      </div>
                      {r.created_at && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {new Date(r.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StarRating rating={r.rating} />
                  </div>
                </div>

                {r.comment && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">
                    "{r.comment}"
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="card py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Star className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-teal-950">
                No reviews found
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {selectedRatingFilter
                  ? "No reviews match the selected star filter."
                  : "Be the first to share your experience with Smart Hospital."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Review Submission Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-teal-950">
                Share Your Patient Experience
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
                <h4 className="mt-3 text-base font-bold text-teal-950">
                  Thank you for your feedback!
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Your review has been submitted and published.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Your Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g., Ayesha Khan"
                    className="input-field mt-1.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Rating <span className="text-rose-500">*</span>
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className="rounded p-1 text-2xl transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          className={`h-7 w-7 ${
                            s <= rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-200"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-semibold text-slate-600">
                      {rating} out of 5 stars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    Your Feedback
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us about the clinical care, doctors, and facilities..."
                    className="input-field mt-1.5"
                  />
                </div>

                {submitError && (
                  <div className="flex items-center gap-2 text-xs text-rose-600">
                    <AlertCircle className="h-4 w-4" />
                    {submitError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-outline text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !reviewerName.trim()}
                    className="btn-primary inline-flex items-center gap-2 text-xs"
                  >
                    {submitting ? "Submitting..." : "Post Review"}
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
