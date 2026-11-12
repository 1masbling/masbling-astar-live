import { useState } from 'react';
import { Lock, Eye, EyeOff, Check, Circle } from 'lucide-react';
import { passwordRuleResults } from '@/lib/password';

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
  label?: string;
  showChecklist?: boolean;
}

export default function PasswordField({
  value,
  onChange,
  autoComplete,
  placeholder = '••••••••',
  label = 'Password',
  showChecklist = false,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const results = passwordRuleResults(value);

  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="input pl-9 pr-12 font-mono tracking-normal"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-700 hover:text-navy-100 transition-colors"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {showChecklist && (
        <ul aria-live="polite" className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {results.map((rule) => (
            <li
              key={rule.id}
              className={`flex items-center gap-2 text-xs transition-colors duration-200 ${rule.met ? 'text-success-400' : 'text-navy-400'}`}
            >
              {rule.met ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3 h-3 shrink-0" />}
              <span>{rule.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
