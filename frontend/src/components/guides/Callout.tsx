interface CalloutProps {
  type?: "info" | "warning" | "success";
  children: React.ReactNode;
}

export function Callout({ type = "info", children }: CalloutProps) {
  // The site's own palette (#504): warm neutral, brand orange, and the
  // green used for good news elsewhere.
  const styles = {
    info: "bg-soft border-line text-ink",
    warning:
      "bg-orange-50 border-orange-400 text-ink dark:bg-orange-950/40 dark:border-orange-700",
    success: "bg-good-soft border-good text-ink",
  };

  return (
    <div className={`my-6 rounded-r-xl border-l-4 p-4 ${styles[type]}`}>
      {children}
    </div>
  );
}
