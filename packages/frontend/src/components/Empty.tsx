export const Empty = ({title, text, action, onAction}: {title: string; text: string; action?: string; onAction?: () => void}) => (
  <div className="empty">
    <span>◇</span><h3>{title}</h3><p>{text}</p>
    {action ? <button className="button primary" onClick={onAction}>{action}</button> : null}
  </div>
);
