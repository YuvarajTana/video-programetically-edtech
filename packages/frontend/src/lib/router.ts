export type View =
  | {name: 'dashboard'}
  | {name: 'new'}
  | {name: 'editor'; id: string}
  | {name: 'library'}
  | {name: 'jobs'; id?: string}
  | {name: 'audio'}
  | {name: 'legacy'};

export const parseRoute = (): View => {
  const route = window.location.hash.replace(/^#\/?/, '');
  const [name, id] = route.split('/');
  if (name === 'projects' && id) return {name: 'editor', id};
  if (name === 'new') return {name: 'new'};
  if (name === 'library') return {name: 'library'};
  if (name === 'jobs') return {name: 'jobs', id};
  if (name === 'audio' || name === 'voices') return {name: 'audio'};
  if (name === 'legacy') return {name: 'legacy'};
  return {name: 'dashboard'};
};

export const navigate = (path: string) => {
  window.location.hash = path;
};
