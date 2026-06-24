interface ErrorBannerProps {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

export function ErrorBanner({ title, message, action }: ErrorBannerProps) {
  return (
    <div className="error-banner">
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {action && (
        <button type="button" className="secondary-button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
