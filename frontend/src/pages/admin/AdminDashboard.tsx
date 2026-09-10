import { useEffect, useState } from "react";
import {
  reportsApi,
  reviewsApi,
  type ReportOverview,
  type HospitalReview,
  type ReviewSummary,
} from "../../lib/apiClient";

export default function AdminDashboard() {
  const [stats, setStats] =
    useState<ReportOverview | null>(null);

  const [reviewSummary, setReviewSummary] =
    useState<ReviewSummary | null>(null);

  const [reviews, setReviews] =
    useState<HospitalReview[]>([]);

  const [loadingReviews, setLoadingReviews] =
    useState(true);

  useEffect(() => {
    reportsApi
      .overview()
      .then(setStats)
      .catch(console.error);

    async function loadReviews() {
      try {
        setLoadingReviews(true);

        const [summary, reviewList] =
          await Promise.all([
            reviewsApi.summary(),
            reviewsApi.adminList(),
          ]);

        setReviewSummary(summary);
        setReviews(reviewList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingReviews(false);
      }
    }

    loadReviews();
  }, []);

  const cards = [
    {
      label: "Total Doctors",
      value: stats?.doctors ?? "—",
    },
    {
      label: "Total Patients",
      value: stats?.patients ?? "—",
    },
    {
      label: "Appointments Today",
      value:
        stats?.appointmentsToday ?? "—",
    },
    {
      label: "Pending Appointments",
      value:
        stats?.pendingAppointments ?? "—",
    },
  ];

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(
      "en-PK",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  function stars(rating: number) {
    return (
      "★".repeat(rating) +
      "☆".repeat(5 - rating)
    );
  }

  return (
    <div>
      {/* ======================================================
          HEADER
      ====================================================== */}
      <h1 className="text-2xl font-semibold text-teal-950">
        Overview
      </h1>

      <p className="mt-1 text-sm text-slate-500">
        Hospital management overview and website feedback.
      </p>

      {/* ======================================================
          MAIN DASHBOARD CARDS
      ====================================================== */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="card"
          >
            <div className="text-sm text-slate-500">
              {card.label}
            </div>

            <div className="mt-1 text-3xl font-semibold text-teal-950">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* ======================================================
          WEBSITE REVIEW SUMMARY
      ====================================================== */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-teal-950">
          Website Feedback
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Overall visitor feedback and hospital rating.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Total Reviews */}
          <div className="card">
            <div className="text-sm text-slate-500">
              Total Website Reviews
            </div>

            <div className="mt-1 text-3xl font-semibold text-teal-950">
              {loadingReviews
                ? "—"
                : reviewSummary?.totalReviews ?? 0}
            </div>

            <div className="mt-2 text-sm text-slate-500">
              Visitor reviews of City Care Hospital
            </div>
          </div>

          {/* Average Rating */}
          <div className="card">
            <div className="text-sm text-slate-500">
              Average Hospital Rating
            </div>

            <div className="mt-1 text-3xl font-semibold text-teal-950">
              {loadingReviews
                ? "—"
                : reviewSummary
                    ?.averageRating
                    .toFixed(1) ?? "0.0"}
            </div>

            <div className="mt-1 text-lg tracking-wide text-amber-500">
              {loadingReviews
                ? "☆☆☆☆☆"
                : stars(
                    Math.round(
                      reviewSummary?.averageRating ??
                        0
                    )
                  )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          RECENT WEBSITE REVIEWS
      ====================================================== */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-teal-950">
              Recent Website Reviews
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest feedback submitted by visitors.
            </p>
          </div>
        </div>

        <div className="mt-4">
          {loadingReviews ? (
            <div className="card text-sm text-slate-500">
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="card text-sm text-slate-500">
              No website reviews have been submitted yet.
            </div>
          ) : (
            <div className="space-y-4">
              {reviews
                .slice(0, 5)
                .map((review) => (
                  <div
                    key={review.id}
                    className="rounded-lg border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      {/* Reviewer */}
                      <div>
                        <div className="font-medium text-teal-950">
                          {review.reviewer_name}
                        </div>

                        <div className="mt-1 text-sm tracking-wide text-amber-500">
                          {stars(
                            review.rating
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="text-xs text-slate-400">
                        {formatDate(
                          review.created_at
                        )}
                      </div>
                    </div>

                    {/* Feedback */}
                    {review.comment && (
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        “{review.comment}”
                      </p>
                    )}

                    {/* Verified Patient */}
                    {review.is_verified_patient && (
                      <div className="mt-3">
                        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                          Verified Patient
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}