import { useEffect, useState } from "react";
import { reviewsApi } from "../../lib/apiClient";
import type { Review } from "../../lib/types";
import StarRating from "../../components/StarRating";

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    reviewsApi.list().then(setReviews).catch(console.error);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-teal-950">Patient Reviews</h1>
      <div className="mt-8 space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-teal-950">{r.reviewer_name}</span>
                {r.doctor_name && <span className="text-sm text-slate-500"> — {r.doctor_name}</span>}
              </div>
              <StarRating rating={r.rating} />
            </div>
            {r.is_verified_patient && (
              <span className="mt-1 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800">
                Verified Patient
              </span>
            )}
            <p className="mt-2 text-sm text-slate-600">{r.comment}</p>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-slate-500">No reviews yet.</p>}
      </div>
    </div>
  );
}
