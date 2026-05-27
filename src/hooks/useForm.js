/**
 * Lightweight form helper that pairs nicely with the field config array
 * used by the Beneficiary Form. It exposes:
 *
 *   values, errors,
 *   setValue(key, val),   // also clears that field's error
 *   setError(key, err),   // imperative override
 *   reset(initial),
 *   validate()            // runs validateForm against current values
 *
 * Validation comes from utils/validation so the same regex catalog is
 * shared with any other screen that needs it.
 */

import {useCallback, useState} from 'react';

import {validateForm} from '../utils/validation';

export const useForm = (fieldsConfig, initialValues = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const setValue = useCallback((key, val) => {
    setValues(prev => ({...prev, [key]: val}));
    setErrors(prev => {
      if (!prev[key]) return prev;
      const next = {...prev};
      delete next[key];
      return next;
    });
  }, []);

  const setError = useCallback((key, err) => {
    setErrors(prev => ({...prev, [key]: err}));
  }, []);

  const reset = useCallback((next = {}) => {
    setValues(next);
    setErrors({});
  }, []);

  const validate = useCallback(() => {
    const result = validateForm(fieldsConfig, values);
    setErrors(result.errors);
    return result;
  }, [fieldsConfig, values]);

  return {values, errors, setValue, setError, setValues, reset, validate};
};

export default useForm;
