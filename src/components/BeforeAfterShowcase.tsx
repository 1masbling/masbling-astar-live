import { ArrowRight, Camera } from 'lucide-react';
import { LOGO_SRC } from '@/lib/watermark';
import { useProjectPhotos } from '@/lib/use-project-photos';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';

export default function BeforeAfterShowcase() {
  const state = useProjectPhotos();
  if (state.status !== 'ready') return null;

  const pairs = state.projects.flatMap(project => {
    if (!project.beforeUrl || !project.afterUrl) return [];
    return [{ project, before: project.beforeUrl, after: project.afterUrl }];
  });
  if (pairs.length === 0) return null;

  return (
    <section id="gallery" className="py-14 sm:py-20 px-4 sm:px-6 bg-navy-900/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-400/10 border border-gold-600/30 px-3 py-1.5 mb-3">
            <Camera className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-xs font-medium text-gold-300">Before & After</span>
          </div>
          <h2 className="font-display text-2xl sm:text-4xl font-bold text-white mb-3">See the Difference</h2>
          <p className="text-sm text-navy-300 max-w-xl mx-auto">
            Drag the slider to reveal the transformation. Every photo is our own work — watermarked to prove it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {pairs.map(({ project, before, after }) => (
            <figure key={project.id} className="overflow-hidden rounded-2xl border border-navy-800 bg-navy-900">
              <BeforeAfterSlider beforeImage={before} afterImage={after} logoUrl={LOGO_SRC} />
              <figcaption className="p-4">
                <p className="font-display text-base font-bold text-white truncate">{project.title}</p>
                <p className="text-xs text-navy-300 mt-0.5 truncate">{project.serviceLabel} · {project.city}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a href="#job-gallery" className="inline-flex items-center gap-2 rounded-lg bg-navy-800 hover:bg-navy-700 px-5 py-2.5 text-sm font-semibold text-gold-300 transition-colors">
            View all completed projects <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
