import React from 'react';

interface InputFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export function InputField({ label, type = 'text', value, onChange, error }: InputFieldProps) {
  return (
    <div className="input">
      <label>{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      {error ? <div className="err">{error}</div> : null}
    </div>
  );
}