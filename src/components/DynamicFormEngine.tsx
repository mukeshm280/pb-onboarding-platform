import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Form } from '@bpmn-io/form-js';
import { Box, Alert } from '@mui/material';
import '@bpmn-io/form-js/dist/assets/form-js.css';

interface DynamicFormEngineProps {
    schema: Record<string, unknown>;
    initialData?: Record<string, unknown>;
    externalErrors?: Record<string, string>;
    showAllErrors?: boolean;
    onTouchedField?: (fieldKey: string) => void;
    onChange?: (data: Record<string, unknown>, errors: Record<string, unknown>) => void;
}

export const DynamicFormEngine: React.FC<DynamicFormEngineProps> = ({
    schema,
    initialData = {},
    externalErrors = {},
    showAllErrors = false,
    onTouchedField,
    onChange,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const formRef = useRef<Form | null>(null);
    const onChangeRef = useRef(onChange);
    const onTouchedFieldRef = useRef(onTouchedField);
    const previousDataRef = useRef<Record<string, unknown>>(initialData);
    const isFormInitializedRef = useRef<boolean>(false);
    const touchedFieldsRef = useRef<Set<string>>(new Set());
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Keep callback references fresh to avoid re-triggering effects
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        onTouchedFieldRef.current = onTouchedField;
    }, [onTouchedField]);

    // Reset touched fields when schema changes
    useEffect(() => {
        touchedFieldsRef.current.clear();
        setValidationErrors({});
        isFormInitializedRef.current = false;
    }, [schema]);

    const markFieldTouched = (fieldKey: string) => {
        if (!fieldKey || !isFormInitializedRef.current) return;
        touchedFieldsRef.current.add(fieldKey);
        if (onTouchedFieldRef.current) {
            onTouchedFieldRef.current(fieldKey);
        }
    };

    useEffect(() => {
        if (!containerRef.current) return;

        isFormInitializedRef.current = false;

        // Instantiate form-js viewer/editor
        const form = new Form({
            container: containerRef.current,
        });

        formRef.current = form;
        previousDataRef.current = initialData;

        // Import schema & initial data
        form.importSchema(schema, initialData).then(() => {
            // Save initialized data state and mark form as ready
            try {
                previousDataRef.current = form._getState()?.data || initialData;
            } catch {
                previousDataRef.current = initialData;
            }
            isFormInitializedRef.current = true;

            if (showAllErrors) {
                try {
                    form.validate();
                } catch {
                    // Ignore internal errors
                }
            }
        }).catch((err) => {
            console.error('Failed to import form-js schema:', err);
        });

        // Event binding for form field blur (touched state)
        const handleFormFieldBlur = (event: any) => {
            const fieldKey = event?.formField?.key || event?.formField?.id;
            if (fieldKey && isFormInitializedRef.current) {
                markFieldTouched(fieldKey);
            }
        };

        // Event binding for form changes and validation
        const handleFormChange = (event: { data: Record<string, unknown>; errors: Record<string, unknown> }) => {
            if (isFormInitializedRef.current) {
                // Check which fields have changed values and mark them as touched
                const currentData = event.data || {};
                const prevData = previousDataRef.current || {};
                Object.keys(currentData).forEach((key) => {
                    if (currentData[key] !== prevData[key]) {
                        markFieldTouched(key);
                    }
                });
                previousDataRef.current = currentData;
            }

            // Track validation errors
            if (event.errors && Object.keys(event.errors).length > 0) {
                const errorMap: Record<string, string> = {};
                Object.entries(event.errors).forEach(([key, error]: [string, any]) => {
                    const message = Array.isArray(error) ? error[0] : (error?.message || `Invalid value for ${key}`);
                    errorMap[key] = message;
                });
                setValidationErrors(errorMap);
            } else {
                setValidationErrors({});
            }

            if (onChangeRef.current) {
                onChangeRef.current(event.data, event.errors);
            }
        };

        form.on('changed', handleFormChange);
        form.on('formField.blur', handleFormFieldBlur);

        // Native DOM focusout listener as additional capture for touched fields
        const containerNode = containerRef.current;
        const handleFocusOut = (e: FocusEvent) => {
            if (!isFormInitializedRef.current) return;
            const target = e.target as HTMLElement | null;
            if (!target) return;

            const name = (target as HTMLInputElement).name;
            const id = target.id;
            const formFieldElem = target.closest('.fjs-form-field');
            const dataFieldKey = formFieldElem?.getAttribute('data-field-key') || formFieldElem?.getAttribute('data-id');
            const extractedKey = name || dataFieldKey || (id ? id.replace(/^fjs-form-[^-]+-/, '') : null);

            if (extractedKey) {
                markFieldTouched(extractedKey);
            }
        };

        containerNode.addEventListener('focusout', handleFocusOut);

        // Teardown logic on unmount to prevent DOM memory leaks
        return () => {
            containerNode.removeEventListener('focusout', handleFocusOut);
            form.off('changed', handleFormChange);
            form.off('formField.blur', handleFormFieldBlur);
            form.destroy();
            formRef.current = null;
        };
    }, [schema]); // Only re-instantiate if schema definition changes

    // When showAllErrors is true (e.g. Next / Submit clicked), trigger form-js full validation
    useEffect(() => {
        if (showAllErrors && formRef.current) {
            try {
                formRef.current.validate();
            } catch {
                // Ignore any internal form-js validation errors
            }
        }
    }, [showAllErrors]);

    // Validation errors to display in the Alert banner and highlight container
    const displayedErrors = useMemo(() => {
        // Only show validation errors on the page when the user has clicked Next / Submit
        if (!showAllErrors) {
            return {};
        }

        const merged: Record<string, string> = { ...externalErrors, ...validationErrors };
        return merged;
    }, [externalErrors, validationErrors, showAllErrors]);

    const hasErrors = Object.keys(displayedErrors).length > 0;

    return (
        <Box>
            {hasErrors && (
                <Alert severity="error" sx={{ mb: 2 }} data-testid="validation-errors-alert">
                    <strong>Validation Errors:</strong>
                    <ul style={{ margin: '8px 0 0 20px', paddingLeft: 0 }}>
                        {Object.entries(displayedErrors).map(([key, error]) => (
                            <li key={key} style={{ marginBottom: '4px' }}>
                                {error}
                            </li>
                        ))}
                    </ul>
                </Alert>
            )}
            <Box
                ref={containerRef}
                sx={{
                    borderRadius: 1,
                    border: hasErrors ? '2px solid #f44336' : '1px solid #e0e0e0',
                    padding: 2,
                    backgroundColor: '#fafafa',
                    minHeight: '400px',
                    '& .fjs-container': {
                        fontFamily: 'inherit',
                    },
                    '& .fjs-form-field': {
                        marginBottom: 2,
                    },
                    '& .fjs-errors': {
                        color: '#f44336',
                    },
                    '& .fjs-powered-by': {
                        display: 'none',
                    },
                }}
            />
        </Box>
    );
};