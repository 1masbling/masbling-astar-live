import { useEffect, useState } from 'react';
import { fetchProjectPhotos, type ProjectPhoto } from '@/lib/project-photos';

export type ProjectPhotosState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; projects: ProjectPhoto[] };

export function useProjectPhotos(): ProjectPhotosState {
  const [state, setState] = useState<ProjectPhotosState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchProjectPhotos()
      .then(projects => {
        if (!cancelled) setState({ status: 'ready', projects });
      })
      .catch(err => {
        console.error('Loading project photos failed:', err);
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
