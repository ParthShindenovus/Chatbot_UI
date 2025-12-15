import { useEffect, useRef } from "react";
import { useSessionStore } from "../store/sessionStore";

/**
 * Custom hook for widget initialization
 * Single Responsibility: Handle widget initialization logic
 */
export function useWidgetInitialization() {
  const { initialize, initialized, error } = useSessionStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!initialized && !error && !hasInitialized.current) {
      hasInitialized.current = true;
      initialize();
    }
  }, [initialize, initialized, error]);
}

