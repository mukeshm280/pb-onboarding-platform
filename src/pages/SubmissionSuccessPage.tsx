import React from 'react';
import { Box, Button, Card, CardContent, Typography, Stack, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { SubmittedRecord } from '../types/router';

interface SubmissionSuccessPageProps {
  submittedData: SubmittedRecord | null;
  onReset: () => void;
}

export const SubmissionSuccessPage: React.FC<SubmissionSuccessPageProps> = ({ submittedData, onReset }) => {
  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);

  const payload = JSON.stringify(submittedData?.data ?? {}, null, 2);

  const handleCopyPayload = async () => {
    await navigator.clipboard.writeText(payload);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 2000);
  };

  const handleBackToOnboarding = () => {
    onReset();
    navigate('/');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', p: 3 }}>
      <Card sx={{ maxWidth: 900, width: '100%', p: 2 }}>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
            Submission Successful
          </Typography>

          <Typography variant="body1" sx={{ mb: 3 }}>
            The onboarding dossier for <strong>{submittedData?.caseId}</strong> was submitted successfully on {submittedData?.submittedAt}.
          </Typography>

          <Stack spacing={2} sx={{ mb: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h6">Submitted payload</Typography>
              <Tooltip title={isCopied ? 'Payload copied' : 'Copy payload'}>
                <IconButton
                  aria-label={isCopied ? 'Payload copied' : 'Copy payload'}
                  onClick={handleCopyPayload}
                  size="small"
                >
                  {isCopied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                </IconButton>
              </Tooltip>
            </Stack>
            <Box
              component="pre"
              sx={{
                bgcolor: '#111827',
                color: '#f9fafb',
                p: 2,
                borderRadius: 2,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '0.85rem',
              }}
            >
              {payload}
            </Box>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={handleBackToOnboarding}>
              Back to Onboarding
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
