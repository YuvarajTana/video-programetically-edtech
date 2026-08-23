import type {EditableVideoSpec} from '@video-kit/core/contracts';
import {
  VARIANT_GROUPS,
  aspectRatioLabel,
  defaultVariantsFor,
  type OutputVariant,
} from '../outputs';

/**
 * Choosing what a project produces.
 *
 * The registry has always held more than the five platform packages — a
 * poster, an Open Graph card, a looping GIF, a storyboard sheet — but nothing
 * could ask for them: `outputs` was missing from the spec contract, so zod
 * stripped it on every save. This is the picker that writes it.
 *
 * Choosing nothing is not the same as choosing none. `variantsFor` falls back
 * to the deliveries when `outputs` is empty, so the empty state shows that
 * fallback set as inherited rather than pretending the project produces
 * nothing.
 */
const summarise = (variant: OutputVariant) =>
  `${variant.kind.replace('-', ' ')} · ${aspectRatioLabel(variant.aspect)}`;

export const OutputPicker = ({
  spec,
  onChange,
}: {
  spec: EditableVideoSpec;
  onChange: (outputs: string[] | undefined) => void;
}) => {
  const chosen = spec.outputs ?? [];
  const inherited = defaultVariantsFor(spec.deliveries ?? []);
  const inheritedIds = new Set(inherited.map((variant) => variant.id));

  const toggle = (id: string) => {
    // The first change to an inherited set materialises it, so unticking a
    // delivery-provided output does what it looks like it does rather than
    // silently adding it to an empty explicit list.
    const current = chosen.length ? chosen : inherited.map((variant) => variant.id);
    const next = current.includes(id)
      ? current.filter((entry) => entry !== id)
      : [...current, id];
    // An empty explicit selection is indistinguishable from no selection, so
    // it would spring back to the full inherited set. Refuse the last untick
    // and leave "Reset to delivery defaults" as the way back.
    if (!next.length) return;
    onChange(next);
  };

  return (
    <details className="output-picker">
      <summary>
        Outputs
        <small>
          {chosen.length
            ? `${chosen.length} chosen`
            : `${inherited.length} from deliveries`}
        </small>
      </summary>
      <div className="output-picker-panel">
        {chosen.length ? (
          <button
            type="button"
            className="button quiet small"
            onClick={() => onChange(undefined)}
          >
            Reset to delivery defaults
          </button>
        ) : null}
        {VARIANT_GROUPS.map((group) => (
          <fieldset key={group.kind}>
            <legend>{group.label}</legend>
            {group.variants.map((variant) => {
              const isChosen = chosen.includes(variant.id);
              const isInherited = !chosen.length && inheritedIds.has(variant.id);
              return (
                <label
                  className={isInherited ? 'inherited' : undefined}
                  key={variant.id}
                  title={isInherited ? 'Included by the selected deliveries' : undefined}
                >
                  <input
                    type="checkbox"
                    checked={isChosen || isInherited}
                    onChange={() => toggle(variant.id)}
                  />
                  <span>{variant.label}</span>
                  <small>{summarise(variant)}</small>
                </label>
              );
            })}
          </fieldset>
        ))}
      </div>
    </details>
  );
};
