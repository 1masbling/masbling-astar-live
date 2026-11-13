import { useProjectPhotos } from '@/lib/use-project-photos';
import type { ProjectPhoto } from '@/lib/project-photos';

const HERO_TILE_COUNT = 2;

interface HeroTile {
  id: string;
  url: string;
  alt: string;
}

function pickHeroTiles(projects: ProjectPhoto[]): HeroTile[] {
  const ordered = [...projects.filter(p => p.featured), ...projects.filter(p => !p.featured)];
  return ordered.flatMap(project => {
    const url = project.afterUrl ?? project.beforeUrl;
    return url ? [{ id: project.id, url, alt: `${project.title} ${project.serviceLabel}` }] : [];
  }).slice(0, HERO_TILE_COUNT);
}

export default function HeroProjectPhotos() {
  const state = useProjectPhotos();

  if (state.status === 'loading') {
    return (
      <div className="grid grid-cols-2 gap-3" aria-hidden="true">
        <div className="h-48 sm:h-64 rounded-2xl bg-navy-800/60 animate-pulse" />
        <div className="h-48 sm:h-64 rounded-2xl bg-navy-800/60 animate-pulse mt-6" />
      </div>
    );
  }
  if (state.status === 'error') return null;

  const tiles = pickHeroTiles(state.projects);
  if (tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile, index) => (
        <img
          key={tile.id}
          src={tile.url}
          alt={tile.alt}
          loading="lazy"
          className={`rounded-2xl object-cover h-48 sm:h-64 w-full ${index === 1 ? 'mt-6' : ''} ${tiles.length === 1 ? 'col-span-2' : ''}`}
        />
      ))}
    </div>
  );
}
