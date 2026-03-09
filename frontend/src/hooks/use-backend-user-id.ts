import { useState, useEffect } from "react";
import { useUser } from "@/lib/user-context";
import { getUserByEmail } from "@/lib/api";

/**
 * Resolves and caches the real backend user_id via email lookup.
 * Stores in localStorage as "user_id" for consistent access.
 */
export function useBackendUserId() {
  const { currentUser } = useUser();
  const [userId, setUserId] = useState<string | null>(() => {
    const stored = localStorage.getItem("user_id");
    console.log("[useBackendUserId] init — localStorage user_id:", stored);
    return stored && stored !== "undefined" && stored !== "null" ? stored : null;
  });
  const [loading, setLoading] = useState(!userId);

  useEffect(() => {
    if (!currentUser) {
      setUserId(null);
      setLoading(false);
      return;
    }

    // If we already have a cached user_id, use it
    const stored = localStorage.getItem("user_id");
    if (stored && stored !== "undefined" && stored !== "null") {
      setUserId(stored);
      setLoading(false);
      return;
    }

    // Resolve via email
    setLoading(true);
    getUserByEmail(currentUser.email)
      .then((user) => {
        const resolvedUser = (user as any).user || user;
        const id = resolvedUser.id;
        if (id) {
          console.log("[useBackendUserId] resolved user_id:", id);
          localStorage.setItem("user_id", id);
          localStorage.setItem("user_role", resolvedUser.role || currentUser.role);
          localStorage.setItem("user_name", resolvedUser.full_name || currentUser.full_name);
          localStorage.setItem("user_email", resolvedUser.email || currentUser.email);
          setUserId(id);
        }
      })
      .catch((err) => {
        console.error("[useBackendUserId] Failed to resolve user:", err);
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  // Always return a valid string or null, never undefined
  const safeUserId = userId && userId !== "undefined" && userId !== "null" ? userId : null;
  return { userId: safeUserId, loading };
}
