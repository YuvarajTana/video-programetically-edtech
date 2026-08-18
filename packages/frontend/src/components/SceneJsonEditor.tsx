import type {Scene} from '@video-kit/core/spec';
import {useEffect, useState} from 'react';

export const SceneJsonEditor = ({scene, onChange}: {scene: Scene; onChange: (scene: Scene) => void}) => {
  const [value, setValue] = useState(() => JSON.stringify(scene, null, 2));
  const [error, setError] = useState('');
  useEffect(() => setValue(JSON.stringify(scene, null, 2)), [scene.id, scene.type]);
  return (
    <>
      <textarea className="json-editor" value={value} onChange={(event) => setValue(event.target.value)} rows={12} />
      {error ? <small className="form-error">{error}</small> : null}
      <button
        className="button quiet small"
        onClick={() => {
          try {
            onChange(JSON.parse(value) as Scene);
            setError('');
          } catch {
            setError('This is not valid JSON.');
          }
        }}
      >
        Apply data
      </button>
    </>
  );
};
