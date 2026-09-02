import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRoutes } from './routes';
import type { SubmittedRecord } from './types/router';

const CASE_ID = 'CASE-PB-2026-001';

const clearPersistedOnboardingData = () => {
  localStorage.removeItem(`pb-onboarding:draft:${CASE_ID}`);
  localStorage.removeItem(`pb-onboarding:participants:${CASE_ID}`);
};

export function AppShell() {
  const [submittedData, setSubmittedData] = useState<SubmittedRecord | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const navigate = useNavigate();

  const handleSubmitSuccess = useCallback(
    (payload: SubmittedRecord) => {
      setSubmittedData(payload);
      setResetSignal((current) => current + 1);
      clearPersistedOnboardingData();
      navigate('/success');
    },
    [navigate]
  );

  const handleReset = useCallback(() => {
    setSubmittedData(null);
    setResetSignal((current) => current + 1);
    clearPersistedOnboardingData();
    navigate('/');
  }, [navigate]);

  return (
    <AppRoutes
      submittedData={submittedData}
      onReset={handleReset}
      onSubmitSuccess={handleSubmitSuccess}
      resetSignal={resetSignal}
    />
  );
}
