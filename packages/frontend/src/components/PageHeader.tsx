export const PageHeader = ({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <header className="page-header">
    <div>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
    {action}
  </header>
);
