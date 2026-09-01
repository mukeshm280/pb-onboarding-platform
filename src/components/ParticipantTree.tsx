import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    TextField,
    Select,
    MenuItem,
    Button,
    Box,
    Stack,
    Typography,
    Paper,
    IconButton,
    Snackbar,
    Alert,
    FormControl,
    FormHelperText,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { EntityParticipant } from '../types/rpc';

interface ParticipantTreeProps {
    caseId: string;
    participants: EntityParticipant[];
    showAllErrors?: boolean;
    onUpdate: (updated: EntityParticipant[]) => void;
}

const STORAGE_KEY_PREFIX = 'pb-onboarding:participants:';

// Helper functions for localStorage operations
const getStorageKey = (caseId: string) => `${STORAGE_KEY_PREFIX}${caseId}`;

const loadParticipantsFromStorage = (caseId: string): EntityParticipant[] => {
    try {
        const stored = localStorage.getItem(getStorageKey(caseId));
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to load participants from storage:', error);
        return [];
    }
};

const saveParticipantsToStorage = (caseId: string, participants: EntityParticipant[]): void => {
    try {
        if (participants.length === 0) {
            localStorage.removeItem(getStorageKey(caseId));
            return;
        }

        localStorage.setItem(getStorageKey(caseId), JSON.stringify(participants));
    } catch (error) {
        console.error('Failed to save participants to storage:', error);
    }
};

export const ParticipantTree: React.FC<ParticipantTreeProps> = ({
    caseId,
    participants,
    showAllErrors = false,
    onUpdate,
}) => {
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [isRemoving, setIsRemoving] = useState<number | null>(null);
    const [touched, setTouched] = useState<Record<number, Record<string, boolean>>>({});
    const hasHydratedFromStorageRef = useRef(false);

    // Validate a participant
    const validateParticipant = useCallback((participant: EntityParticipant): Record<string, string> => {
        const errors: Record<string, string> = {};

        if (!participant.participantName || participant.participantName.trim() === '') {
            errors.participantName = 'Name is required';
        }

        if (!participant.participantRole) {
            errors.participantRole = 'Role is required';
        }

        const percentage = participant.shareholdingPercentage || 0;
        if (percentage < 0 || percentage > 100) {
            errors.shareholdingPercentage = 'Share must be between 0 and 100%';
        }

        return errors;
    }, []);

    const participantErrors = useMemo(() => {
        const allErrors: Record<number, Record<string, string>> = {};

        participants.forEach((participant, index) => {
            const errors = validateParticipant(participant);
            if (Object.keys(errors).length > 0) {
                allErrors[index] = errors;
            }
        });

        return allErrors;
    }, [participants, validateParticipant]);

    const markFieldTouched = (index: number, field: string) => {
        setTouched((prev) => ({
            ...prev,
            [index]: {
                ...(prev[index] || {}),
                [field]: true,
            },
        }));
    };

    const isFieldTouched = (index: number, field: string) => {
        return showAllErrors || Boolean(touched[index]?.[field]);
    };

    // Load participants from localStorage only once per case, and never after an explicit delete.
    useEffect(() => {
        if (hasHydratedFromStorageRef.current || !caseId) {
            return;
        }

        hasHydratedFromStorageRef.current = true;

        const storedParticipants = loadParticipantsFromStorage(caseId);
        if (storedParticipants.length > 0 && participants.length === 0) {
            onUpdate(storedParticipants);
        }
    }, [caseId, onUpdate, participants.length]);

    // Save participants to localStorage whenever they change, removing stale empty data.
    useEffect(() => {
        saveParticipantsToStorage(caseId, participants);
    }, [caseId, participants]);

    const handleRemove = useCallback(async (index: number) => {
        const participantToRemove = participants[index];
        setIsRemoving(index);

        try {
            // Simulate async operation (localStorage is sync but we keep the pattern)
            await new Promise(resolve => setTimeout(resolve, 300));

            const nextList = participants.filter((_, i) => i !== index);
            onUpdate(nextList);

            setSnackbar({
                open: true,
                message: `Participant "${participantToRemove.participantName || 'Unknown'}" removed successfully`,
                severity: 'success',
            });
        } catch (error) {
            console.error('Failed to remove participant:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to remove participant';
            setSnackbar({
                open: true,
                message: errorMessage,
                severity: 'error',
            });
        } finally {
            setIsRemoving(null);
        }
    }, [participants, onUpdate]);

    const handleAdd = () => {
        const newParticipant: EntityParticipant = {
            participantName: '',
            participantRole: 'UBO',
            shareholdingPercentage: 0,
        };
        onUpdate([...participants, newParticipant]);
    };

    return (
        <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                Associated Entity Participants
            </Typography>
            <Stack spacing={2}>
                {participants.map((p, index) => {
                    const rowErrors = participantErrors[index] || {};
                    return (
                        <Box
                            key={index}
                            sx={{
                                display: 'flex',
                                gap: 2,
                                alignItems: 'flex-start',
                                pb: 2,
                                borderBottom: index < participants.length - 1 ? '1px solid #e0e0e0' : 'none',
                            }}
                        >
                            <TextField
                                label="Full Name / Corporate Name"
                                variant="outlined"
                                size="small"
                                value={p.participantName}
                                error={isFieldTouched(index, 'participantName') && Boolean(rowErrors.participantName)}
                                helperText={isFieldTouched(index, 'participantName') ? rowErrors.participantName : undefined}
                                sx={{ flex: 1 }}
                                onBlur={() => markFieldTouched(index, 'participantName')}
                                onChange={(e) => {
                                    markFieldTouched(index, 'participantName');
                                    const copy = [...participants];
                                    copy[index] = { ...copy[index], participantName: e.target.value };
                                    onUpdate(copy);
                                }}
                            />
                            <FormControl
                                size="small"
                                error={isFieldTouched(index, 'participantRole') && Boolean(rowErrors.participantRole)}
                                sx={{ minWidth: 200 }}
                            >
                                <Select
                                    value={p.participantRole || 'UBO'}
                                    onBlur={() => markFieldTouched(index, 'participantRole')}
                                    onChange={(e) => {
                                        markFieldTouched(index, 'participantRole');
                                        const copy = [...participants];
                                        copy[index] = { ...copy[index], participantRole: e.target.value as EntityParticipant['participantRole'] };
                                        onUpdate(copy);
                                    }}
                                >
                                    <MenuItem value="UBO">Ultimate Beneficial Owner (UBO)</MenuItem>
                                    <MenuItem value="DIRECTOR">Director / Council Member</MenuItem>
                                    <MenuItem value="SIGNATORY">Authorised Signatory</MenuItem>
                                    <MenuItem value="SETTLOR">Settlor / Grantor</MenuItem>
                                </Select>
                                {isFieldTouched(index, 'participantRole') && rowErrors.participantRole && (
                                    <FormHelperText>{rowErrors.participantRole}</FormHelperText>
                                )}
                            </FormControl>
                            <TextField
                                label="Share %"
                                variant="outlined"
                                size="small"
                                type="number"
                                value={p.shareholdingPercentage ?? 0}
                                error={isFieldTouched(index, 'shareholdingPercentage') && Boolean(rowErrors.shareholdingPercentage)}
                                helperText={isFieldTouched(index, 'shareholdingPercentage') ? rowErrors.shareholdingPercentage : undefined}
                                sx={{ width: 120 }}
                                onBlur={() => markFieldTouched(index, 'shareholdingPercentage')}
                                onChange={(e) => {
                                    markFieldTouched(index, 'shareholdingPercentage');
                                    const copy = [...participants];
                                    copy[index] = { ...copy[index], shareholdingPercentage: Number(e.target.value) };
                                    onUpdate(copy);
                                }}
                            />
                            <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleRemove(index)}
                                disabled={isRemoving !== null}
                                sx={{ mt: 0.5 }}
                                title="Remove this participant"
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Box>
                    );
                })}
            </Stack>
            <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                sx={{ mt: 3 }}
            >
                Add Participant
            </Button>

            {/* Error/Success Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Paper>
    );
};