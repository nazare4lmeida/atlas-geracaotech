import { useState } from 'react';

export default function useForm(initialState) {
  const [values, setValues] = useState(initialState);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const setFieldValue = (name, value) => {
    setValues((current) => ({
      ...current,
      [name]: value
    }));
  };

  const reset = () => setValues(initialState);

  return { values, setValues, handleChange, setFieldValue, reset };
}
