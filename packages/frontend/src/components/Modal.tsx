export const Modal = ({title, children, onClose}: {title: string; children: React.ReactNode; onClose: () => void}) => (
  <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {if (event.target === event.currentTarget) onClose();}}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <header><h2>{title}</h2><button aria-label="Close" onClick={onClose}>×</button></header>
      {children}
    </section>
  </div>
);
