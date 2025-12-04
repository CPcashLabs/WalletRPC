import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrainCircuit, ArrowRight, Globe, Box, Network, Layers, Zap, Coins, MousePointer2, Lock, Cpu, ChevronRight, Play } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import * as THREE from 'three';

interface LandingPageProps {
  onEnter: () => void;
}

// --- Animation Components ---

const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ 
  children, 
  delay = 0,
  className = "" 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${className} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// --- Brilliant Neural Core 3D Animation ---

const NeuralCoreAnimation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup
    const scene = new THREE.Scene();
    // Add subtle fog for depth
    scene.fog = new THREE.FogExp2(0x000000, 0.035);

    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 4.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    containerRef.current.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // 1. The Core Sphere (Dense particles)
    const particleCount = 2000;
    const particles = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    const pSizes = new Float32Array(particleCount);
    const pColors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x2997ff); // Apple Blue
    const color2 = new THREE.Color(0xbf5af2); // Purple
    const color3 = new THREE.Color(0xffffff); // White

    for (let i = 0; i < particleCount; i++) {
      // Spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 1.8 + Math.random() * 0.2; // Radius variation

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      pPositions[i * 3] = x;
      pPositions[i * 3 + 1] = y;
      pPositions[i * 3 + 2] = z;

      pSizes[i] = Math.random();

      // Mix colors
      const mixedColor = i % 3 === 0 ? color1 : (i % 3 === 1 ? color2 : color3);
      pColors[i * 3] = mixedColor.r;
      pColors[i * 3 + 1] = mixedColor.g;
      pColors[i * 3 + 2] = mixedColor.b;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));
    particles.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    // Custom shader material for glowing dots
    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: renderer.getPixelRatio() }
      },
      vertexShader: `
        uniform float time;
        uniform float pixelRatio;
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec3 pos = position;
          // Subtle pulse
          float pulse = sin(time * 2.0 + pos.x * 2.0) * 0.05;
          pos += normal * pulse;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * pixelRatio * (30.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          // Circular particle
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float r = length(xy);
          if (r > 0.5) discard;
          
          // Soft edge
          float alpha = 1.0 - smoothstep(0.3, 0.5, r);
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(particles, shaderMaterial);
    group.add(particleSystem);

    // 2. Connecting Lines (Outer Shell)
    const wireGeo = new THREE.IcosahedronGeometry(2.2, 2);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.15 });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    // Convert to wireframe manually to have Lines
    const wireframe = new THREE.WireframeGeometry(wireGeo);
    const lineSegments = new THREE.LineSegments(wireframe, wireMat);
    group.add(lineSegments);

    // 3. Floating Data Bits (Outer Orbit)
    const orbitCount = 100;
    const orbitGeo = new THREE.BufferGeometry();
    const orbitPos = new Float32Array(orbitCount * 3);
    for(let i=0; i<orbitCount*3; i+=3) {
       const theta = Math.random() * Math.PI * 2;
       const phi = Math.acos((Math.random() * 2) - 1);
       const r = 3.5 + Math.random() * 1.5;
       orbitPos[i] = r * Math.sin(phi) * Math.cos(theta);
       orbitPos[i+1] = r * Math.sin(phi) * Math.sin(theta);
       orbitPos[i+2] = r * Math.cos(phi);
    }
    orbitGeo.setAttribute('position', new THREE.BufferAttribute(orbitPos, 3));
    const orbitMat = new THREE.PointsMaterial({ color: 0x888888, size: 0.03, transparent: true, opacity: 0.4 });
    const orbitSystem = new THREE.Points(orbitGeo, orbitMat);
    group.add(orbitSystem);

    // Interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
       mouseX = (e.clientX - window.innerWidth / 2) * 0.0005;
       mouseY = (e.clientY - window.innerHeight / 2) * 0.0005;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotate group
      group.rotation.y += 0.002;
      group.rotation.x += 0.001;

      // Mouse Parallax (Ease in)
      group.rotation.y += (mouseX - group.rotation.y) * 0.05;
      group.rotation.x += (mouseY - group.rotation.x) * 0.05;

      // Pulse shader
      shaderMaterial.uniforms.time.value = elapsedTime;

      // Rotate orbit rings opposite
      orbitSystem.rotation.y -= 0.004;
      lineSegments.rotation.z += 0.001;

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        if (containerRef.current && renderer.domElement) {
           containerRef.current.removeChild(renderer.domElement);
        }
        particles.dispose();
        shaderMaterial.dispose();
        wireGeo.dispose();
        wireMat.dispose();
        orbitGeo.dispose();
        orbitMat.dispose();
        renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0 opacity-100" />;
};

// --- Components ---

const BentoCard: React.FC<{ 
  title: string; 
  desc: string; 
  icon: React.ElementType; 
  children?: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ title, desc, icon: Icon, children, className = "", delay = 0 }) => (
  <FadeIn delay={delay} className={`bg-[#161617]/50 backdrop-blur-md border border-white/5 rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative group hover:bg-[#1c1c1e]/80 transition-colors duration-500 ${className}`}>
    <div className="relative z-10">
      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#0071e3] group-hover:scale-110 transition-all duration-500">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">{title}</h3>
      <p className="text-[#86868b] text-sm leading-relaxed font-medium">{desc}</p>
    </div>
    {children}
  </FadeIn>
);

// --- Main Page ---

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const { t, language, setLanguage } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => setLanguage(language === 'en' ? 'zh' : 'en');

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] font-sans selection:bg-[#0071e3]/30 selection:text-white overflow-x-hidden">
      
      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? 'bg-[#1d1d1f]/70 backdrop-blur-xl border-b border-white/5' : 'bg-transparent py-6'}`}>
        <div className="max-w-[1000px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer group" onClick={onEnter}>
             <BrainCircuit className="w-5 h-5 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
             <span className="font-semibold tracking-tight text-white text-sm">ZeroState Hub</span>
          </div>

          <div className="flex items-center space-x-6 text-xs font-medium text-[#f5f5f7]/80">
            <a href="#genesis" className="hover:text-white transition-colors hidden sm:block">{t('landing.nav.genesis')}</a>
            <a href="#features" className="hover:text-white transition-colors hidden sm:block">{t('landing.nav.directives')}</a>
            
            <button onClick={toggleLanguage} className="hover:text-white transition-colors flex items-center">
              <Globe className="w-3 h-3 mr-1" />
              {language === 'en' ? 'EN' : 'ZH'}
            </button>
            
            <button 
              onClick={onEnter} 
              className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-semibold hover:scale-105 transition-transform duration-300"
            >
              {t('landing.nav.app')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        
        {/* The Core Animation */}
        <div className="absolute inset-0 z-0">
          <NeuralCoreAnimation />
        </div>
        
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000] via-transparent to-[#000]/30 pointer-events-none z-0" />

        <FadeIn className="relative z-10 max-w-5xl mx-auto space-y-8 mt-20">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-4 animate-in fade-in slide-in-from-top-4 duration-1000 delay-300">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">System Operational</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-white drop-shadow-2xl">
            {t('landing.hero.title_prefix')} <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#ffffff] via-[#a1a1a6] to-[#6e6e73]">
              {t('landing.hero.title_suffix')}
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-[#86868b] max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-lg">
            {t('landing.hero.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
            <button 
              onClick={onEnter}
              className="group px-8 py-4 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-base font-semibold transition-all shadow-[0_0_20px_rgba(0,113,227,0.3)] hover:shadow-[0_0_30px_rgba(0,113,227,0.5)] flex items-center"
            >
              {t('landing.hero.btn_launch')}
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-base font-medium flex items-center transition-all border border-white/5">
              {t('landing.hero.btn_doc')}
              <ArrowRight className="w-4 h-4 ml-2 opacity-60" />
            </button>
          </div>
        </FadeIn>
      </section>

      {/* Genesis Section */}
      <section id="genesis" className="py-32 bg-[#000] px-6 relative z-10">
        <div className="max-w-[1000px] mx-auto">
          <FadeIn>
            <div className="max-w-3xl">
              <span className="text-[#0071e3] font-semibold text-lg mb-6 block tracking-wide">{t('landing.genesis.subtitle')}</span>
              <h2 className="text-4xl md:text-6xl font-semibold text-[#f5f5f7] mb-10 tracking-tight leading-tight">
                {t('landing.genesis.title')}
              </h2>
              <p className="text-xl md:text-2xl text-[#86868b] leading-relaxed font-medium">
                {t('landing.genesis.desc')}
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Directives Section - Bento Grid */}
      <section id="features" className="py-32 bg-[#000] px-6 relative z-10">
        <div className="max-w-[1000px] mx-auto space-y-20">
          <div className="text-center max-w-2xl mx-auto">
            <FadeIn>
              <h2 className="text-4xl md:text-5xl font-semibold text-[#f5f5f7] mb-6 tracking-tight">{t('landing.goals.title')}</h2>
              <p className="text-[#86868b] text-xl font-medium">{t('landing.goals.subtitle')}</p>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
            {/* Card 1: Privacy (Large) */}
            <BentoCard 
              title={t('landing.goals.privacy')} 
              desc={t('landing.goals.privacy_desc')} 
              icon={Lock}
              className="md:col-span-2 bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e]"
              delay={100}
            >
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-12 translate-y-12 rotate-[-15deg]">
                <Lock className="w-72 h-72 text-white" />
              </div>
            </BentoCard>

            {/* Card 2: Cost */}
            <BentoCard 
              title={t('landing.goals.low_cost')} 
              desc={t('landing.goals.low_cost_desc')} 
              icon={Coins} 
              delay={200}
            />

            {/* Card 3: Access */}
            <BentoCard 
              title={t('landing.goals.access')} 
              desc={t('landing.goals.access_desc')} 
              icon={MousePointer2} 
              delay={300}
            />

            {/* Card 4: Architecture (Large) */}
            <BentoCard 
              title={t('landing.arch.title')} 
              desc={t('landing.arch.subtitle')} 
              icon={Cpu}
              className="md:col-span-2 lg:col-span-2 bg-gradient-to-bl from-[#1c1c1e] to-[#242426]"
              delay={400}
            >
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-10 relative z-10">
                 {[
                   { t: 'Modular', i: Box }, 
                   { t: 'P2P', i: Network }, 
                   { t: 'Gemini', i: BrainCircuit }, 
                   { t: 'Open', i: Layers }
                 ].map((feat, idx) => (
                   <div key={idx} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 flex flex-col items-center justify-center text-center border border-white/5 hover:bg-white/10 transition-colors duration-300">
                      <feat.i className="w-6 h-6 text-[#86868b] mb-3 group-hover:text-white transition-colors" />
                      <span className="text-xs font-semibold text-white tracking-wide">{feat.t}</span>
                   </div>
                 ))}
               </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-6 bg-[#000] text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0071e3]/10 blur-[120px] rounded-full pointer-events-none" />
        
        <FadeIn className="max-w-3xl mx-auto space-y-10 relative z-10">
          <div className="inline-block p-5 rounded-3xl bg-[#1c1c1e] mb-4 border border-white/5 shadow-2xl">
             <Zap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-5xl md:text-7xl font-semibold text-white tracking-tight leading-tight">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl md:text-2xl text-[#86868b] font-medium">
            {t('landing.cta.desc')}
          </p>
          <div className="pt-8">
            <button 
              onClick={onEnter}
              className="px-12 py-5 bg-white text-black rounded-full text-lg font-bold hover:bg-[#f5f5f7] transition-all transform hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            >
              {t('landing.cta.btn')}
            </button>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="bg-[#111112] py-16 px-6 text-xs text-[#86868b]">
        <div className="max-w-[1000px] mx-auto border-t border-[#333] pt-10">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                 <p className="font-mono text-[10px] opacity-60">{t('landing.footer.shutdown')}</p>
                 <p>Copyright © 2025 ZeroState Hub. All rights reserved.</p>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                <a href="#" className="hover:text-white hover:underline transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white hover:underline transition-colors">Terms of Use</a>
                <a href="#" className="hover:text-white hover:underline transition-colors">Sales and Refunds</a>
                <a href="#" className="hover:text-white hover:underline transition-colors">Legal</a>
                <a href="#" className="hover:text-white hover:underline transition-colors">Site Map</a>
              </div>
           </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;