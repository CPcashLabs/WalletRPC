
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ParticleIntroProps {
  onComplete?: () => void;
  fadeOut?: boolean;
}

export const ParticleIntro: React.FC<ParticleIntroProps> = ({ onComplete, fadeOut = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const speedRef = useRef<number>(0.2); // Initial speed

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.001);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 1;
    camera.rotation.x = Math.PI / 2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starCount = 6000;
    const positions = new Float32Array(starCount * 3);
    const velocities = [];

    for(let i=0; i<starCount; i++) {
      positions[i*3] = (Math.random() - 0.5) * 600;
      positions[i*3+1] = (Math.random() - 0.5) * 600;
      positions[i*3+2] = (Math.random() - 0.5) * 600;
      velocities.push(0);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create a circular sprite for stars
    // Better: use simple PointsMaterial
    const starMaterial = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.7,
      transparent: true
    });

    const stars = new THREE.Points(starGeo, starMaterial);
    scene.add(stars);

    // Animation Loop
    const animate = () => {
      // Warp speed logic
      const positions = starGeo.attributes.position.array as Float32Array;
      
      // Increase speed over time
      if (speedRef.current < 4) speedRef.current *= 1.01;

      for(let i=0; i<starCount; i++) {
        // Move stars towards camera (which is facing roughly Y/Z in this setup depending on rotation)
        // Let's simplify: Move along Y axis in local space of rotation
        positions[i*3 + 1] -= speedRef.current; // Move down Y
        
        // Reset if passed camera
        if (positions[i*3 + 1] < -200) {
           positions[i*3 + 1] = 200;
        }
      }
      
      starGeo.attributes.position.needsUpdate = true;
      stars.rotation.y += 0.002;

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      // Cleanup Three resources
      starGeo.dispose();
      starMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
        className={`
            fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden
            animate-in fade-in duration-1000
            transition-all duration-1000 ease-in-out
            ${fadeOut ? 'opacity-0 blur-lg scale-110' : 'opacity-100 scale-100'}
        `}
    >
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Content Container */}
      <div className="relative z-10 text-center max-w-4xl px-8 animate-in fade-in zoom-in duration-1000 delay-500 fill-mode-forwards flex flex-col items-center">
         
         {/* Decentralization Node Symbol */}
         <div className="mb-8 opacity-80">
            <div className="w-16 h-16 border border-white/10 rounded-full flex items-center justify-center relative">
                <div className="absolute inset-0 border-t-2 border-indigo-400 rounded-full animate-spin"></div>
                <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"></div>
            </div>
         </div>

         {/* The Date */}
         <div className="font-mono text-indigo-300/80 text-xs md:text-sm mb-4 tracking-[0.2em] uppercase border-b border-white/10 pb-2">
            The Times 03/Jan/2009
         </div>
         
         {/* The Quote */}
         <h1 className="text-2xl md:text-5xl font-serif font-bold text-white tracking-tight mb-8 leading-tight drop-shadow-2xl opacity-95 italic">
            "Chancellor on brink of<br className="hidden md:block"/> second bailout for banks"
         </h1>

         {/* Status */}
         <div className="flex flex-col items-center space-y-3 mt-4">
             <div className="flex justify-center space-x-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
             </div>
             <div className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-medium">
                Syncing Distributed Ledger
             </div>
         </div>
      </div>
    </div>
  );
};
