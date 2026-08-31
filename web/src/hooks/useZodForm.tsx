import { useState, useCallback, useRef } from 'react';
import { type ZodType, type ZodError } from 'zod';

type FieldErrors<T> = Partial<Record<keyof T, string>>;

interface UseZodFormOptions<T extends Record<string, unknown>> {
  schema: ZodType<T, any, any>;
  initialValues: T;
}

export function useZodForm<T extends Record<string, unknown>>({
  schema,
  initialValues,
}: UseZodFormOptions<T>) {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialRef = useRef(initialValues);

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  const setValues = useCallback((partial: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...partial }));
  }, []);

  const validate = useCallback((): T | null => {
    const result = schema.safeParse(values);
    if (result.success) {
      setErrors({});
      return result.data;
    }
    const fieldErrors: FieldErrors<T> = {};
    for (const issue of (result.error as ZodError).issues) {
      const field = issue.path[0] as keyof T;
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    setErrors(fieldErrors);
    return null;
  }, [schema, values]);

  const handleSubmit = useCallback(
    (onSubmit: (data: T) => Promise<void> | void) => {
      return async (e?: React.FormEvent) => {
        e?.preventDefault();
        const data = validate();
        if (!data) return;
        setIsSubmitting(true);
        try {
          await onSubmit(data);
        } finally {
          setIsSubmitting(false);
        }
      };
    },
    [validate],
  );

  const reset = useCallback(
    (newValues?: T) => {
      setValuesState(newValues ?? initialRef.current);
      setErrors({});
    },
    [],
  );

  const getInputProps = useCallback(
    (field: keyof T) => ({
      value: (values[field] ?? '') as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValuesState(prev => ({ ...prev, [field]: e.target.value } as T));
        setErrors(prev => {
          if (prev[field]) {
            const next = { ...prev };
            delete next[field];
            return next;
          }
          return prev;
        });
      },
    }),
    [values],
  );

  const getSelectProps = useCallback(
    (field: keyof T) => ({
      value: (values[field] ?? '') as string,
      onValueChange: (val: string) => {
        setValuesState(prev => ({ ...prev, [field]: val } as T));
        setErrors(prev => {
          if (prev[field]) {
            const next = { ...prev };
            delete next[field];
            return next;
          }
          return prev;
        });
      },
    }),
    [values],
  );

  return {
    values,
    errors,
    isSubmitting,
    setValue,
    setValues,
    validate,
    handleSubmit,
    reset,
    getInputProps,
    getSelectProps,
  };
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="text-red-500 text-xs mt-1">{message}</span>;
}
