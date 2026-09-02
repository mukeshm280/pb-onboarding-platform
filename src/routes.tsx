import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { SubmissionSuccessPage } from './pages/SubmissionSuccessPage';
import type { SubmittedRecord } from './types/router';

interface AppRoutesProps {
  submittedData: SubmittedRecord | null;
  onReset: () => void;
  onSubmitSuccess: (submittedData: SubmittedRecord) => void;
  resetSignal: number;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ submittedData, onReset, onSubmitSuccess, resetSignal }) => {
  return (
    <Routes>
      <Route path="/" element={<App key={resetSignal} onSubmitSuccess={onSubmitSuccess} />} />
      <Route
        path="/success"
        element={<SubmissionSuccessPage submittedData={submittedData} onReset={onReset} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
