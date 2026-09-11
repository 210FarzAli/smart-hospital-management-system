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
import StarRating from "../../components/StarRating";
import {
  CalendarIcon,
  SparklesIcon,
  PhoneIcon,
  ShieldCheckIcon,
  ActivityIcon,
  UsersIcon,
  ClockIcon,
  HospitalIcon,
  ArrowRightIcon,
  HeartPulseIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SendIcon,
} from "../../components/icons/Icons";

export default function Home() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [topDoctors, setTopDoctors] = useState<Doctor[]>([]);
  const [reviews, setReviews] = useState<HospitalReview[]>([]);

  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    departmentsApi
      .list()
      .then(setDepartments)
      .catch(console.error);

    doctorsApi
      .list()
      .then((docs) => setTopDoctors(docs.slice(0, 4)))
      .catch(console.error);

    reviewsApi
      .list()
      .then(setReviews)
      .catch(console.error);
  }, []);

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();

    setReviewMessage(null);
    setReviewError(null);

    if (!reviewerName.trim()) {
      setReviewError("Please enter your name.");
      return;
    }

    if (!comment.trim()) {
      setReviewError("Please write your feedback.");
      return;
    }

    try {
      setSubmittingReview(true);

      await reviewsApi.create({
        reviewer_name: reviewerName.trim(),
        rating,
        comment: comment.trim(),
      });

      setReviewMessage("Thank you! Your review has been submitted successfully.");
      setReviewerName("");
      setRating(5);
      setComment("");

      const updatedReviews = await reviewsApi.list();
      setReviews(updatedReviews);
    } catch (err) {
      console.error(err);
      setReviewError(
        err instanceof Error ? err.message : "Failed to submit your review."
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="space-y-0">
      {/* ======================================================
          HERO SECTION
      ====================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-950 via-slate-900 to-teal-900 text-white">
        {/* Subtle decorative radial background blur */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl"></div>
        <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl"></div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-300 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Tertiary Care & Research Center</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.12]">
                Care that starts the moment you visit{" "}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-cyan-200 to-white">
                  — no account needed.
                </span>
              </h1>

              <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-slate-300">
                Browse departments and consultant doctors, book an OPD appointment, or
                consult our AI Health Assistant in English, Urdu, or Roman Urdu — whichever
                feels natural to you.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/book"
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-teal-400 px-6 py-3.5 text-sm font-bold text-teal-950 shadow-lg shadow-teal-400/20 transition-all duration-200 hover:bg-teal-300 hover:scale-105 active:scale-100"
                >
                  <CalendarIcon className="w-5 h-5 text-teal-950" />
                  <span>Book an Appointment</span>
                </Link>

                <Link
                  to="/assistant"
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-teal-300/40 bg-teal-950/40 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-all duration-200 hover:bg-teal-900/60 hover:border-teal-200"
                >
                  <SparklesIcon className="w-5 h-5 text-teal-300" />
                  <span>Ask AI Assistant (24/7)</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-teal-400" />
                  <span>Instant Verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-teal-400" />
                  <span>Verified Specialists</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-teal-400" />
                  <span>No Password Required</span>
                </div>
              </div>
            </div>

            {/* Right Card: Emergency & Quick Triage */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-3xl border border-teal-400/20 bg-gradient-to-b from-white/10 to-white/5 p-7 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-400/30">
                    <AlertTriangleIcon className="w-6 h-6 text-rose-400 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Emergency Trauma Center</h2>
                    <p className="text-xs text-rose-300 font-medium">Open 24/7 • Immediate Walk-in</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  Critical condition or accident? Visit our emergency department directly.
                  No advance booking required for trauma, cardiac, or stroke emergencies.
                </p>

                <div className="mt-6 rounded-2xl bg-rose-950/50 border border-rose-800/40 p-4">
                  <span className="text-xs uppercase tracking-wider font-semibold text-rose-300 block">
                    Immediate Emergency Dispatch
                  </span>
                  <a
                    href="tel:021111227391"
                    className="mt-1 flex items-center gap-2 text-xl font-extrabold text-white hover:text-rose-200 transition-colors"
                  >
                    <PhoneIcon className="w-5 h-5 text-rose-400" />
                    <span>(021) 111-CARE-911</span>
                  </a>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 pt-2 text-center text-xs">
                  <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                    <span className="block font-bold text-teal-300 text-sm">Level 1</span>
                    <span className="text-slate-400 text-[11px]">Trauma Facility</span>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                    <span className="block font-bold text-teal-300 text-sm">&lt; 5 mins</span>
                    <span className="text-slate-400 text-[11px]">Average Triage</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Hospital Stats Bar */}
        <div className="border-t border-teal-900/60 bg-teal-950/70 backdrop-blur-md">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-6 sm:grid-cols-4 sm:gap-8">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-800/60 text-teal-300">
                <UsersIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white">50+</div>
                <div className="text-xs text-slate-400">Senior Consultants</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-800/60 text-teal-300">
                <HospitalIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white">15+</div>
                <div className="text-xs text-slate-400">Modern Departments</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-800/60 text-teal-300">
                <ClockIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white">24/7</div>
                <div className="text-xs text-slate-400">Emergency & Pharmacy</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-800/60 text-teal-300">
                <HeartPulseIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white">99.8%</div>
                <div className="text-xs text-slate-400">Patient Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          CLINICAL DEPARTMENTS
      ====================================================== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Specialized Healthcare
            </span>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
              Clinical Departments
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-xl">
              Each department is staffed by experienced senior specialists and equipped
              with state-of-the-art diagnostic and clinical technologies.
            </p>
          </div>

          <Link
            to="/departments"
            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-900 hover:text-teal-700 transition"
          >
            <span>Browse All Departments</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <Link
              key={d.id}
              to={`/departments/${d.id}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-card"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800 group-hover:bg-teal-900 group-hover:text-white transition-colors duration-200">
                    <ActivityIcon className="w-6 h-6" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-900 transition-colors">
                    Specialized OPD
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                  {d.name}
                </h3>

                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {d.description || "Comprehensive clinical diagnosis, inpatient care, and treatment."}
                </p>

                {d.services && d.services.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {d.services.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/60"
                      >
                        {s}
                      </span>
                    ))}
                    {d.services.length > 3 && (
                      <span className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-400">
                        +{d.services.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-teal-800 group-hover:text-teal-600 pt-3 border-t border-slate-100">
                <span>View Specialists & OPD Schedule</span>
                <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ======================================================
          TOP RATED DOCTORS
      ====================================================== */}
      <section className="bg-slate-50/80 border-y border-slate-200/80 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Medical Leadership
              </span>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                Top Rated Specialists
              </h2>
              <p className="mt-2 text-sm text-slate-500 max-w-xl">
                Consult with our highest-rated practitioners across key medical specialties.
                View schedules and book consultations directly.
              </p>
            </div>

            <Link
              to="/doctors"
              className="inline-flex items-center gap-2 text-sm font-semibold text-teal-900 hover:text-teal-700 transition"
            >
              <span>View All Doctors</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {topDoctors.map((doc) => (
              <DoctorCard key={doc.id} doctor={doc} />
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          WHY CHOOSE CITY CARE HOSPITAL (TRUST PILLARS)
      ====================================================== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
            Patient First Philosophy
          </span>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
            Why Patients Choose City Care
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Built from the ground up to reduce patient wait times, provide transparent OPD
            schedules, and ensure immediate care.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
              <ShieldCheckIcon className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Verified Consultant Doctors
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              All doctors undergo rigorous credential verification and maintain regular
              OPD shifts for dependable patient care.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Zero-Friction OPD Booking
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              No account creation or password needed. Simply pick your doctor, select their
              working shift, and get immediate confirmation.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
              <SparklesIcon className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              24/7 AI Health Assistant
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Ask medical questions anytime in English, Urdu, or Roman Urdu to receive
              reliable preliminary guidance and triage advice.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
              <HeartPulseIcon className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Fully Integrated Care
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Electronic prescriptions flow seamlessly from doctor consultation to our
              on-premise 24/7 hospital pharmacy.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================
          REVIEWS & PATIENT FEEDBACK
      ====================================================== */}
      <section className="border-t border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">
            {/* Left Column: Rating Score & Submit Form */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  Verified Patient Feedback
                </span>
                <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                  What Patients Say
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Every review helps our clinical team continually elevate care quality.
                </p>

                {reviews.length > 0 && (
                  <div className="mt-6 flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-4xl font-extrabold text-teal-950">
                      {averageRating.toFixed(1)}
                    </div>
                    <div>
                      <StarRating rating={averageRating} size="md" showNumber={false} />
                      <p className="mt-1 text-xs text-slate-500 font-medium">
                        Based on {reviews.length} patient {reviews.length === 1 ? "review" : "reviews"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  Share Your Experience
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Your feedback helps fellow patients and empowers our care teams.
                </p>

                <form onSubmit={submitReview} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="e.g. Tariq Mehmood"
                      className="input-field"
                      maxLength={100}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Rating
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setRating(val)}
                          className="p-1 transition-transform hover:scale-110 active:scale-95"
                          aria-label={`${val} star rating`}
                        >
                          <span
                            className={`text-2xl ${
                              val <= rating ? "text-amber-500" : "text-slate-200"
                            }`}
                          >
                            ★
                          </span>
                        </button>
                      ))}
                      <span className="ml-2 text-xs font-semibold text-slate-600">
                        {rating} of 5 stars
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Your Feedback *
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Tell us about your doctor consultation, nursing care, or overall hospital visit..."
                      rows={3}
                      className="input-field resize-none"
                      maxLength={1000}
                      required
                    />
                  </div>

                  {reviewMessage && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{reviewMessage}</span>
                    </div>
                  )}

                  {reviewError && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                      <AlertTriangleIcon className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>{reviewError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="btn-primary w-full py-3"
                  >
                    <SendIcon className="w-4 h-4" />
                    <span>{submittingReview ? "Submitting..." : "Submit Review"}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Recent Reviews Grid */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  Recent Patient Reviews ({reviews.length})
                </h3>
                <Link
                  to="/reviews"
                  className="text-xs font-semibold text-teal-800 hover:text-teal-600"
                >
                  View All Reviews →
                </Link>
              </div>

              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  No patient reviews yet. Be the first to share your experience!
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review) => (
                    <div
                      key={review.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-teal-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {review.reviewer_name}
                            </span>
                            {review.is_verified_patient && (
                              <span className="badge-emerald">
                                <ShieldCheckIcon className="w-3 h-3" />
                                Verified Patient
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <StarRating rating={review.rating} size="sm" showNumber={false} />
                          </div>
                        </div>

                        <span className="text-xs text-slate-400">
                          {formatDate(review.created_at)}
                        </span>
                      </div>

                      {review.comment && (
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          “{review.comment}”
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}