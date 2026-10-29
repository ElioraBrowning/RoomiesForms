import { useState } from 'react';

export function CopyLink({ url, label = 'Copy link' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  return (
    <div className="copy-link">
      <input className="input copy-link-input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Employer link" />
      <button type="button" className="btn btn-secondary btn-small" onClick={copy}>
        {copied ? 'Copied' : label}
      </button>
    </div>
  );
}
