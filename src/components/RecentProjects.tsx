import { Camera, Loader2 } from 'lucide-react';
import { type ProjectPhoto } from '@/lib/project-photos';
import { LOGO_SRC } from '@/lib/watermark';
import { useProjectPhotos } from '@/lib/use-project-photos';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';

function ProjectCard({ project }: { project: ProjectPhoto }) {
  const single = !project.beforeUrl || !project.afterUrl;
  const singleUrl = project.beforeUrl ?? project.afterUrl ?? '';
  const singleLabel = project.beforeUrl ? 'Before' : 'After';

  return (
    <article className="overflow-hidden rounded-2xl border border-navy-800 bg-navy-900">
      {single ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-navy-950">
          <img src={singleUrl} alt={`${project.title} ${singleLabel.toLowerCase()}`} loading="lazy" className="w-full h-full object-cover" />
          <span className="absolute top-3 left-3 rounded-full bg-navy-950/80 px-2.5 py-1 text-[11px] font-semibold text-gold-300">{singleLabel}</span>
        </div>
      ) : (
        <BeforeAfterSlider
          beforeImage={project.beforeUrl ?? ''}
          afterImage={project.afterUrl ?? ''}
          logoUrl={LOGO_SRC}
        />
      )}
      <div className="p-4">
        <p className="font-display text-base font-bold text-white truncate">{project.title}</p>
        <p className="text-xs text-navy-300 mt-0.5 truncate">{project.serviceLabel} · {project.city}</p>
      </div>
    </article>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section id="recent-projects" className="py-14 sm:py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">{children}</div>
    </section>
  );
}

export default function RecentProjects() {
  const state = useProjectPhotos();

  if (state.status === 'loading') {
    return (
      <Shell>
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-gold-400 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (state.status === 'error') {
    return (
      <Shell>
        <p className="text-center text-sm text-navy-300">Recent projects are unavailable right now. Please check back soon.</p>
      </Shell>
    );
  }

  if (state.projects.length === 0) return null;

  return (
    <Shell>
      <div className="text-center mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-gold-400 mb-2 flex items-center justify-center gap-2">
          <Camera className="w-3.5 h-3.5" /> Recent Projects
        </p>
        <h3 className="font-display text-xl sm:text-2xl font-bold text-white">Fresh From the Job Site</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {state.projects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </Shell>
  );
}
