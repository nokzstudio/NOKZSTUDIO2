import { motion, AnimatePresence } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Palette, Layers, Terminal, Shapes, Brush, Image as ImageIcon, ShieldCheck, Box, Shirt } from 'lucide-react';

const services = [
  { name: 'Logo', icon: Shapes, color: 'from-blue-500/20 to-cyan-500/20' },
  { name: 'Ilustrasi', icon: Brush, color: 'from-purple-500/20 to-pink-500/20' },
  { name: 'Banner', icon: ImageIcon, color: 'from-orange-500/20 to-red-500/20' },
  { name: 'Design Jersey', icon: ShieldCheck, color: 'from-green-500/20 to-emerald-500/20' },
  { name: 'Packaging', icon: Box, color: 'from-yellow-500/20 to-amber-500/20' },
  { name: 'Design Kaos', icon: Shirt, color: 'from-indigo-500/20 to-blue-500/20' },
];

const skills = [
  { name: 'Adobe Illustrator', icon: Palette, level: 90, color: '#FF9A00' },
  { name: 'Adobe Photoshop', icon: Layers, level: 90, color: '#31A8FF' },
  { name: 'CorelDraw', icon: Terminal, level: 100, color: '#2C8D3E' },
];

export default function About() {
  const navigate = useNavigate();
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  return (
    <section id="about" className="py-6 bg-base-content/[0.02] rounded-[3rem] overflow-hidden" ref={ref}>
      <div className="max-w-xl mx-auto px-6">
        <div className="text-center mb-6">
          <motion.h4 
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="text-[10px] font-black uppercase tracking-[0.6em] text-base-content mb-2"
          >
            Order Here
          </motion.h4>
          <div className="h-px w-8 bg-primary/30 mx-auto"></div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {services.map((service, index) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group cursor-pointer"
              onClick={() => navigate(`/order/${service.name.toLowerCase().replace(/\s+/g, '-')}`)}
            >
              <div className="aspect-square glass rounded-2xl flex flex-col items-center justify-center p-3 transition-all group-hover:scale-105 group-hover:bg-primary/20 group-hover:border-primary/50 border border-base-content/5 shadow-xl shadow-black/5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                  <service.icon size={20} className="text-white" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-center leading-tight text-base-content/70 group-hover:text-base-content">
                  {service.name}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-base-content/20 text-center mb-4">Software Expertise</h3>
          
          <div className="grid gap-3">
            {skills.map((skill, index) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass p-4 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-base-content/5">
                    <skill.icon size={16} style={{ color: skill.color }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{skill.name}</span>
                    <span className="text-[10px] font-black text-primary">{skill.name === 'CorelDraw' ? '1000%' : `${skill.level}%`}</span>
                  </div>
                </div>
                <div className="w-24 h-1.5 bg-base-content/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${Math.min(skill.level, 100)}%` } : {}}
                    transition={{ duration: 1, delay: 0.5 }}
                    style={{ backgroundColor: skill.color }}
                    className="h-full"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
