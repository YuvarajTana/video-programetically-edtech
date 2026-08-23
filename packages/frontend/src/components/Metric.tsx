export const Metric = ({label, value, note}: {label: string; value: string; note: string}) => (
  <div className="metric">
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{note}</small>
  </div>
);
