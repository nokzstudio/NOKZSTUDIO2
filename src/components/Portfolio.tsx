import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { ExternalLink, Search, X, Palette, Eye } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

const mockProjects = [
  { id: 'm1', title: 'Neo Glitch Branding', category: 'Branding', image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800&auto=format&fit=crop', description: 'Brand identity for a futuristic tech startup.' },
  { id: 'm2', title: 'Liquid Abstract Logo', category: 'Logo', image: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800&auto=format&fit=crop', description: 'Fluid organic logo marks for creative studios.' },
  { id: 'm3', title: 'Streetware Apparel', category: 'Branding', image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=800&auto=format&fit=crop', description: 'Minimalist apparel design for urban brands.' },
  { id: 'm4', title: 'Esports Team Identity', category: 'Illustration', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop', description: 'Aggressive and bold mascot illustration.' },
  { id: 'm5', title: 'Social Feed Series', category: 'Social Media', image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=800&auto=format&fit=crop', description: 'Cohesive Instagram feed templates.' },
  { id: 'm6', title: 'Gradient Typography', category: 'Illustration', image: 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?q=80&w=800&auto=format&fit=crop', description: 'Modern poster design with custom lettering.' },
];

const categories = ['All', 'logo', 'ilustrasi', 'banner', 'design-jersey', 'packaging', 'design-kaos'];

export default function Portfolio() {
  const [projects, setProjects] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(data.length > 0 ? data : mockProjects);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });
    return () => unsubscribe();
  }, []);

  const filteredProjects = projects.filter(p => filter === 'All' || p.category === filter);

  const handleProjectClick = async (project: any) => {
    setSelectedProject(project);
    if (project.id && !project.id.startsWith('m')) { // Don't increment mock projects
      try {
        await updateDoc(doc(db, 'projects', project.id), {
          views: increment(1)
        });
      } catch (error) {
        console.error("Error incrementing views:", error);
      }
    }
  };

  return (
    <section id="portfolio" className="py-6 px-2" ref={ref}>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6 px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="font-display font-black text-4xl tracking-tighter"
          >
            PORTFOLIO <span className="text-base-content/20 uppercase">Saya</span>
          </motion.h2>
          
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6 px-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-3 py-1 rounded-lg text-[7px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                  filter === cat ? "bg-primary text-white" : "bg-base-content/5 text-base-content/40"
                )}
              >
                {cat.toUpperCase().replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <motion.div
           layout
           className="grid grid-cols-3 gap-2"
        >
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <motion.div
                layout
                key={project.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="group relative cursor-pointer"
                onClick={() => handleProjectClick(project)}
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-base-content/5 border border-base-content/5">
                  <img
                    src={project.image}
                    alt={project.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                    <p className="text-[6px] font-black uppercase tracking-widest text-primary mb-0.5">{project.category}</p>
                    <h3 className="text-[7px] font-bold truncate leading-tight text-white">{project.title}</h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Modal Popup */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-surface/95 backdrop-blur-xl"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border-t border-base-content/10 rounded-t-[3rem] w-full max-w-xl h-[85vh] overflow-y-auto relative pb-20"
            >
              <div className="sticky top-0 z-20 flex justify-center py-4 bg-gradient-to-b from-surface to-transparent">
                <div className="w-12 h-1.5 bg-base-content/10 rounded-full" />
              </div>

              <div className="px-6">
                <div className="aspect-square rounded-[2rem] overflow-hidden mb-8 border border-base-content/5 shadow-2xl">
                  <img src={selectedProject.image} className="w-full h-full object-cover" alt="" />
                </div>

                <div className="px-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-primary font-black uppercase tracking-[0.2em] text-[10px]">{selectedProject.category}</p>
                    <div className="flex items-center gap-1.5 text-base-content/40 text-[10px] font-bold">
                      <Eye size={12} />
                      {selectedProject.views || 0}
                    </div>
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter mb-6">{selectedProject.title}</h3>
                  <p className="text-sm text-base-content/50 mb-8 leading-relaxed font-medium">
                    {selectedProject.description}
                  </p>

                  <div className="grid grid-cols-1 gap-3 mb-10">
                    <div className="p-5 rounded-2xl bg-base-content/5 border border-base-content/5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Palette size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-[8px] text-base-content/20 uppercase font-bold tracking-widest">Tools</p>
                        <p className="text-xs font-bold">Illustrator, Photoshop</p>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const url = selectedProject.caseStudyUrl || (!selectedProject.image.startsWith('data:') ? selectedProject.image : null);
                    if (!url) return null;

                    let label = "View Social Post";
                    if (url.includes('behance.net')) label = "Behance Portfolio";
                    else if (url.includes('pinterest.com') || url.includes('pin.it')) label = "Save to Pinterest";
                    else if (url.includes('instagram.com')) label = "Instagram Link";
                    else if (url.includes('dribbble.com')) label = "Dribbble Shot";

                    return (
                      <a 
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-16 bg-base-content text-surface rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-transform"
                      >
                        {label}
                        <ExternalLink size={16} />
                      </a>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}
