import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  id: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: ReactNode;
  helpText?: string;
}

/**
 * ✅ ACCESSIBILITY: Ensures every input has an associated label
 * - label htmlFor connects to input id
 * - error messages have role="alert"
 * - helpText is readable by screen readers
 */
export function FormField({
  label,
  id,
  required,
  description,
  error,
  children,
  helpText,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-text-primary"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {description && (
        <p className="text-xs text-text-secondary">{description}</p>
      )}

      {children}

      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}

      {helpText && !error && (
        <p className="text-xs text-text-secondary">{helpText}</p>
      )}
    </div>
  );
}
