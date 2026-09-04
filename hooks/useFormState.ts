/**
 * ✅ Custom Hook: useFormState
 * Simplifies form state management + validation
 * Reduces boilerplate for form components
 */

import { useState, useCallback } from 'react';

interface FormErrors {
  [key: string]: string;
}

interface UseFormStateOptions<T> {
  initialValues: T;
  onSubmit?: (values: T) => Promise<void>;
  validate?: (values: T) => FormErrors;
}

interface UseFormStateReturn<T> {
  values: T;
  errors: FormErrors;
  isSubmitting: boolean;
  setFieldValue: (name: keyof T, value: any) => void;
  setFieldError: (name: keyof T, error: string) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
}

export function useFormState<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate,
}: UseFormStateOptions<T>): UseFormStateReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts editing
    if (errors[String(name)]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[String(name)];
        return newErrors;
      });
    }
  }, [errors]);

  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [String(name)]: error }));
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const fieldValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFieldValue(name as keyof T, fieldValue);
  }, [setFieldValue]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate
      if (validate) {
        const validationErrors = validate(values);
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return;
        }
      }

      // Submit
      if (onSubmit) {
        try {
          setIsSubmitting(true);
          await onSubmit(values);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Submission failed';
          setErrors({ _submit: message });
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [values, validate, onSubmit]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    setFieldValue,
    setFieldError,
    handleChange,
    handleSubmit,
    reset,
  };
}
