import {randomUUID} from 'node:crypto';
import type {ArtifactRecord} from '@video-kit/core/contracts';
import {now, type DomainContext, type Row} from './context';

/** Files a job produced, and where they landed. */
export const artifactsDomain = ({database}: DomainContext) => ({
  addArtifact(
    jobId: string,
    artifact: Omit<ArtifactRecord, 'id' | 'jobId' | 'createdAt'> & {path: string},
  ) {
    const id = randomUUID();
    const timestamp = now();
    database
      .prepare(
        `INSERT INTO artifacts
          (id, job_id, kind, delivery_id, filename, path, mime_type,
           size_bytes, checksum, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        jobId,
        artifact.kind,
        artifact.deliveryId,
        artifact.filename,
        artifact.path,
        artifact.mimeType,
        artifact.sizeBytes,
        artifact.checksum,
        timestamp,
      );
    return {id, jobId, createdAt: timestamp, ...artifact};
  },

  listArtifacts(jobId: string): ArtifactRecord[] {
    return (
      database
        .prepare('SELECT * FROM artifacts WHERE job_id = ? ORDER BY created_at')
        .all(jobId) as Row[]
    ).map((row) => ({
      id: String(row.id),
      jobId: String(row.job_id),
      kind: String(row.kind),
      deliveryId: row.delivery_id ? String(row.delivery_id) : null,
      filename: String(row.filename),
      mimeType: String(row.mime_type),
      sizeBytes: Number(row.size_bytes),
      checksum: String(row.checksum),
      createdAt: String(row.created_at),
    }));
  },

  artifactPath(id: string) {
    const row = database
      .prepare('SELECT path FROM artifacts WHERE id = ?')
      .get(id) as Row | undefined;
    if (!row) throw new Error('Artifact not found.');
    return String(row.path);
  },
});
