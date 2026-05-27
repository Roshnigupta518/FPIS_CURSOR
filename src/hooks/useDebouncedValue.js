/**
 * Debounce a fast-changing value (e.g. search box input) so downstream
 * filtering / API calls don't fire on every keystroke.
 */

import {useEffect, useState} from 'react';

export const useDebouncedValue = (value, delay = 250) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
};

export default useDebouncedValue;
