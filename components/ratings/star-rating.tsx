"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Star } from "lucide-react";

interface StarRatingProps {
  productId?: string;
  bundleId?: string;
  onRatingSubmit?: (rating: number) => void;
}

export function StarRating({
  productId,
  bundleId,
  onRatingSubmit,
}: StarRatingProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const itemId = productId || bundleId;
  const endpoint = productId
    ? `/api/ratings/products?productId=${productId}`
    : `/api/ratings/bundles?bundleId=${bundleId}`;

  // Get the session on mount
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch rating summary on mount
  useEffect(() => {
    if (!itemId) return;

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        setRating(data.averageRating);
      })
      .catch((err) => {
        console.error("Error fetching rating:", err);
      });
  }, [itemId, endpoint]);

  // Fetch user's current rating if authenticated
  useEffect(() => {
    if (!session?.user || !itemId) return;

    const fetchUserRating = async () => {
      try {
        // For now, user ratings are fetched after submission
        // In a real app, you'd have a separate GET endpoint
      } catch (err) {
        console.error("Error fetching user rating:", err);
      }
    };

    fetchUserRating();
  }, [session?.user, itemId, endpoint]);

  const handleRating = async (newRating: number) => {
    if (!session?.user) {
      setError("Debes estar conectado para calificar");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = productId
        ? "/api/ratings/products"
        : "/api/ratings/bundles";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [productId ? "productId" : "bundleId"]: itemId,
          rating: newRating,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error submitting rating");
      }

      const data = await response.json();
      setUserRating(newRating);
      setRating(data.summary.averageRating);
      onRatingSubmit?.(newRating);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error submitting rating"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!itemId) return null;

  const displayRating = hoverRating || userRating;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {/* Star Display */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRating(star)}
              onMouseEnter={session ? () => setHoverRating(star) : undefined}
              onMouseLeave={session ? () => setHoverRating(null) : undefined}
              disabled={isLoading || !session}
              className={`transition-colors ${
                session
                  ? "cursor-pointer hover:scale-110"
                  : "cursor-not-allowed"
              }`}
            >
              <Star
                size={20}
                className={`${
                  (displayRating || rating || 0) >= star
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Rating Summary */}
        {rating !== null && rating > 0 && (
          <span className="text-sm text-gray-600">
            {rating.toFixed(1)}★
          </span>
        )}
      </div>

      {/* User feedback */}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {userRating && !error && (
        <p className="text-xs text-green-600">
          Tu calificación: {userRating}★
        </p>
      )}
    </div>
  );
}
