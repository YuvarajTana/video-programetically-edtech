import {useEffect, useRef, useState} from 'react';

export const RecordingStep = ({
  number,
  title,
  text,
  complete,
  minimumSeconds,
  maximumSeconds,
  onAudio,
}: {
  number: string;
  title: string;
  text: string;
  complete: boolean;
  minimumSeconds: number;
  maximumSeconds: number;
  onAudio: (
    blob: Blob,
    filename: string,
  ) => Promise<{quality: {valid: boolean; issues: string[]}}>;
}) => {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notice, setNotice] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const disposedRef = useRef(false);

  useEffect(() => {
    if (!recording) return;
    const update = () => {
      const elapsed = Math.min(
        maximumSeconds,
        (Date.now() - startedAtRef.current) / 1000,
      );
      setElapsedSeconds(elapsed);
      if (
        elapsed >= maximumSeconds &&
        recorderRef.current?.state === 'recording'
      ) {
        recorderRef.current.stop();
        setRecording(false);
      }
    };
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [recording, maximumSeconds]);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const upload = async (blob: Blob, filename: string) => {
    setUploading(true);
    setNotice('Uploading and checking audio…');
    try {
      const sample = await onAudio(blob, filename);
      setNotice(
        sample.quality.valid
          ? 'Recording saved privately and passed the quality check.'
          : `Saved privately, but please record again: ${sample.quality.issues.join(' ')}`,
      );
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setUploading(false);
    }
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      streamRef.current = stream;
      const chunks: BlobPart[] = [];
      const next = new MediaRecorder(stream);
      next.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      next.onstop = () => {
        const blob = new Blob(chunks, {type: next.mimeType || 'audio/webm'});
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (!disposedRef.current) void upload(blob, 'recording.webm');
      };
      next.start(500);
      recorderRef.current = next;
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setRecording(true);
      setNotice('');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <article className={`recording-step ${complete ? 'complete' : ''}`}>
      <header><span>{number}</span><strong>{title}</strong>{complete ? <i>✓</i> : null}</header>
      <blockquote>{text}</blockquote>
      <div className={`recording-guide ${recording ? 'active' : ''}`}>
        <strong>
          {recording
            ? `${elapsedSeconds.toFixed(1)}s`
            : `${minimumSeconds}–${maximumSeconds} seconds`}
        </strong>
        <span>
          {recording && elapsedSeconds < minimumSeconds
            ? `Keep reading for ${Math.ceil(minimumSeconds - elapsedSeconds)} more seconds.`
            : recording
              ? 'Minimum reached. Finish the sentence, then stop.'
              : `Record for at least ${minimumSeconds} seconds. Recording stops automatically at ${maximumSeconds} seconds.`}
        </span>
      </div>
      <div className="button-row">
        {!recording ? (
          <button type="button" className="button primary small" disabled={uploading} onClick={() => void start()}>● Start recording</button>
        ) : (
          <button
            type="button"
            className="button danger small"
            disabled={elapsedSeconds < minimumSeconds}
            onClick={() => {
              recorderRef.current?.stop();
              setRecording(false);
            }}
          >
            {elapsedSeconds < minimumSeconds
              ? `Wait ${Math.ceil(minimumSeconds - elapsedSeconds)}s`
              : '■ Stop and check'}
          </button>
        )}
        <label className={`button quiet small file-button ${recording || uploading ? 'disabled' : ''}`}>
          Upload audio
          <input
            type="file"
            accept="audio/*"
            disabled={recording || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file, file.name);
              event.target.value = '';
            }}
          />
        </label>
      </div>
      {notice ? <small>{notice}</small> : null}
    </article>
  );
};
