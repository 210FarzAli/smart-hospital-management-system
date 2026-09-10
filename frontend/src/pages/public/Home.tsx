import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  departmentsApi,
  doctorsApi,
  reviewsApi,
} from "../../lib/apiClient";
import type { Department, Doctor } from "../../lib/types";
import type { HospitalReview } from "../../lib/apiClient";
import DoctorCard from "../../components/DoctorCard";

export default function Home() {
  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [topDoctors, setTopDoctors] =
    useState<Doctor[]>([]);

  const [reviews, setReviews] =
    useState<HospitalReview[]>([]);

  const [reviewerName, setReviewerName] =
    useState("");

  const [rating, setRating] =
    useState(5);

  const [comment, setComment] =
    useState("");

  const [submittingReview, setSubmittingReview] =
    useState(false);

  const [reviewMessage, setReviewMessage] =
    useState<string | null>(null);

  const [reviewError, setReviewError] =
    useState<string | null>(null);

  useEffect(() => {
    departmentsApi
      .list()
      .then(setDepartments)
      .catch(console.error);

    doctorsApi
      .list()
      .then((docs) =>
        setTopDoctors(docs.slice(0, 4))
      )
      .catch(console.error);

    reviewsApi
      .list()
      .then(setReviews)
      .catch(console.error);
  }, []);

  async function submitReview(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setReviewMessage(null);
    setReviewError(null);

    if (!reviewerName.trim()) {
      setReviewError(
        "Please enter your name."
      );
      return;
    }

    if (!comment.trim()) {
      setReviewError(
        "Please write your feedback."
      );
      return;
    }

    try {
      setSubmittingReview(true);

      await reviewsApi.create({
        reviewer_name:
          reviewerName.trim(),

        rating,

        comment:
          comment.trim(),
      });

      setReviewMessage(
        "Thank you! Your review has been submitted."
      );

      setReviewerName("");
      setRating(5);
      setComment("");

      const updatedReviews =
        await reviewsApi.list();

      setReviews(updatedReviews);
    } catch (err) {
      console.error(err);

      setReviewError(
        err instanceof Error
          ? err.message
          : "Failed to submit your review."
      );
    } finally {
      setSubmittingReview(false);
    }
  }

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

  function stars(value: number) {
    return "★".repeat(value) +
      "☆".repeat(5 - value);
  }

  const averageRating =
    reviews.length > 0
      ? reviews.reduce(
          (sum, review) =>
            sum + review.rating,
          0
        ) / reviews.length
      : 0;

  return (
    <div>
      {/* ======================================================
          HERO
      ====================================================== */}
      <section className="bg-teal-50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold leading-tight text-teal-950">
              Care that starts the moment you visit
              — no account needed.
            </h1>

            <p className="mt-4 text-slate-600">
              Browse departments and doctors, book
              an appointment, or talk to our AI
              Health Assistant in English, Urdu, or
              Roman Urdu — whichever feels natural
              to you.
            </p>

            <div className="mt-6 flex gap-3">
              <Link
                to="/book"
                className="btn-primary"
              >
                Book an Appointment
              </Link>

              <Link
                to="/assistant"
                className="btn-secondary"
              >
                Ask the AI Assistant
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-teal-100 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-teal-900">
              Emergency?
            </div>

            <p className="mt-1 text-sm text-slate-600">
              Call our 24/7 emergency line or visit
              the emergency department directly —
              no booking required for urgent care.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================
          DEPARTMENTS
      ====================================================== */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-2xl font-semibold text-teal-950">
          Departments
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {departments.map((d) => (
            <Link
              key={d.id}
              to={`/departments/${d.id}`}
              className="card hover:shadow-md"
            >
              <div className="font-medium text-teal-950">
                {d.name}
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {d.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ======================================================
          TOP DOCTORS
      ====================================================== */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-2xl font-semibold text-teal-950">
          Top Rated Doctors
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {topDoctors.map((doc) => (
            <DoctorCard
              key={doc.id}
              doctor={doc}
            />
          ))}
        </div>
      </section>

      {/* ======================================================
          HOSPITAL REVIEWS
      ====================================================== */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-teal-950">
              What People Say About City Care Hospital
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Share your experience with our hospital
              and help us improve our services.
            </p>

            {reviews.length > 0 && (
              <div className="mt-4">
                <div className="text-3xl font-semibold text-teal-950">
                  {averageRating.toFixed(1)}
                </div>

                <div className="mt-1 text-lg tracking-wide text-amber-500">
                  {stars(
                    Math.round(
                      averageRating
                    )
                  )}
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  Based on {reviews.length}{" "}
                  {reviews.length === 1
                    ? "review"
                    : "reviews"}
                </div>
              </div>
            )}
          </div>

          {/* ====================================================
              REVIEW FORM
          ==================================================== */}
          <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-teal-950">
              Leave a Review
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Tell us about your experience at City
              Care Hospital.
            </p>

            <form
              onSubmit={submitReview}
              className="mt-6 space-y-5"
            >
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Your Name
                </label>

                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) =>
                    setReviewerName(
                      e.target.value
                    )
                  }
                  placeholder="Enter your name"
                  className="input-field w-full"
                  maxLength={100}
                />
              </div>

              {/* Rating */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Your Rating
                </label>

                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setRating(value)
                        }
                        className={`text-3xl transition ${
                          value <= rating
                            ? "text-amber-400"
                            : "text-slate-300"
                        } hover:text-amber-400`}
                        aria-label={`${value} star rating`}
                      >
                        ★
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Your Feedback
                </label>

                <textarea
                  value={comment}
                  onChange={(e) =>
                    setComment(
                      e.target.value
                    )
                  }
                  placeholder="Tell us about your experience..."
                  rows={4}
                  className="input-field w-full resize-none"
                  maxLength={1000}
                />
              </div>

              {/* Success */}
              {reviewMessage && (
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {reviewMessage}
                </div>
              )}

              {/* Error */}
              {reviewError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {reviewError}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingReview}
                className="btn-primary w-full"
              >
                {submittingReview
                  ? "Submitting..."
                  : "Submit Review"}
              </button>
            </form>
          </div>

          {/* ====================================================
              RECENT REVIEWS
          ==================================================== */}
          {reviews.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xl font-semibold text-teal-950">
                Recent Reviews
              </h3>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                {reviews
                  .slice(0, 6)
                  .map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-slate-200 bg-white p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
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

                        <div className="text-xs text-slate-400">
                          {formatDate(
                            review.created_at
                          )}
                        </div>
                      </div>

                      {review.comment && (
                        <p className="mt-4 text-sm leading-6 text-slate-600">
                          “{review.comment}”
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}