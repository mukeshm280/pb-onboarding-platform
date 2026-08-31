import { useState, useEffect, useRef, useCallback } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const STORAGE_KEY_PREFIX = 'pb-onboarding:draft:';

const getStorageKey = (caseId: string) => `${STORAGE_KEY_PREFIX}${caseId}`;

export function useDebouncedAutosave(
  caseId: string,
  formData: Record<string, unknown>,
  delay: number = 500,
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  const saveDraft = useCallback(
    async (dataToSave: Record<string, unknown>) => {
      setStatus("saving");
      try {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Save to localStorage
        localStorage.setItem(getStorageKey(caseId), JSON.stringify(dataToSave));

        const timestamp = new Date().toLocaleTimeString();
        setLastSavedAt(timestamp);
        setStatus("saved");
        
        // Reset to idle after a short delay for visual feedback
        setTimeout(() => setStatus("idle"), 2000);
      } catch (err) {
        console.error("Autosave error:", err);
        setStatus("error");
      }
    },
    [caseId],
  );

  // Load draft on mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        const stored = localStorage.getItem(getStorageKey(caseId));
        if (stored) {
          console.log('Draft loaded from storage for case:', caseId);
        }
      } catch (error) {
        console.error('Failed to load draft from storage:', error);
      }
    };
    
    loadDraft();
  }, [caseId]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      saveDraft(formData);
    }, delay);

    return () => clearTimeout(timer);
  }, [formData, delay, saveDraft]);

  return { status, lastSavedAt };
}
