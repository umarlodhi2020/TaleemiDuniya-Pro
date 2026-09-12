import React from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Phone,
  Mail,
  Calendar,
  Video,
  Image as ImageIcon,
  GraduationCap,
  ChevronRight,
  BookOpen,
  Award,
  Users
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const SchoolWebsiteView = ({ data }) => {
  if (!data) return null;

  const themeStyle = { backgroundColor: data.themeColor || "#4f46e5" };

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full h-full bg-[#030303] text-gray-100 font-sans selection:bg-white/20 overflow-x-hidden relative">
      {/* Dynamic Ambient Glows */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] pointer-events-none" 
        style={themeStyle}
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" 
        style={themeStyle}
      />

      {/* Modern Glass Navbar */}
      <nav className="absolute w-full z-50 top-0 transition-all duration-300 bg-black/30 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-4 cursor-pointer group"
            >
              {data.logo ? (
                <img
                  src={data.logo}
                  alt="Logo"
                  className="h-10 w-10 md:h-12 md:w-12 rounded-xl object-cover border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div
                  className="h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform duration-500"
                  style={themeStyle}
                >
                  <GraduationCap size={24} />
                </div>
              )}
              <h1 className="text-lg md:text-xl font-black text-white tracking-tight group-hover:opacity-80 transition-opacity">
                {data.name || "School Name"}
              </h1>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="hidden md:flex space-x-8"
            >
              {['About', 'Features', 'Gallery', 'Contact'].map((item) => (
                <a
                  key={item}
                  href="#"
                  onClick={(e) => scrollToSection(e, item.toLowerCase())}
                  className="text-xs font-bold text-gray-400 hover:text-white transition-colors relative group py-2"
                >
                  {item}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full rounded-full"></span>
                </a>
              ))}
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Advanced Hero Section */}
      <div className="relative pt-24 pb-16 lg:pt-40 lg:pb-24 px-4 flex items-center justify-center min-h-[85vh]">
        <div className="absolute inset-0 z-0">
           {data.banner && (
              <motion.img 
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.4 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                src={data.banner} 
                alt="Banner" 
                className="w-full h-full object-cover" 
              />
           )}
           <div className="absolute inset-0 bg-gradient-to-b from-[#030303]/40 via-[#030303]/80 to-[#030303]"></div>
        </div>

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-5xl mx-auto text-center"
        >
          <motion.div variants={fadeUp} className="inline-block mb-6 px-5 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={themeStyle}></span>
              Welcome to our Campus
            </span>
          </motion.div>
          
          <motion.h2 
            variants={fadeUp}
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tighter leading-[1.1] text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-600 drop-shadow-2xl pb-2"
          >
            {data.name || "School Name"}
          </motion.h2>
          
          <motion.p 
            variants={fadeUp}
            className="text-lg md:text-2xl font-medium mb-10 text-gray-400 max-w-3xl mx-auto leading-relaxed"
          >
            {data.tagline || "Tagline goes here"}
          </motion.p>
          
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#"
              onClick={(e) => scrollToSection(e, 'about')}
              className="px-8 py-4 text-sm rounded-2xl font-bold text-white shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 group"
              style={themeStyle}
            >
              Explore Campus <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#"
              onClick={(e) => scrollToSection(e, 'contact')}
              className="px-8 py-4 text-sm rounded-2xl font-bold text-white border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Contact Us
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Features Showcase - Bento Grid Style */}
      <div id="features" className="py-24 px-4 relative z-10">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6"
        >
           {[
             { icon: BookOpen, title: "Modern Curriculum", desc: "Updated and advanced curriculum designed to make students future-ready.", color: "blue" },
             { icon: Award, title: "Excellence Awards", desc: "Our students consistently rank top in academic and extracurricular competitions globally.", color: "purple" },
             { icon: Users, title: "Expert Faculty", desc: "Learn from highly qualified and experienced educators dedicated to student success.", color: "emerald" }
           ].map((feat, i) => (
             <motion.div 
               key={i}
               variants={fadeUp}
               whileHover={{ y: -10 }}
               className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl relative overflow-hidden group"
             >
                <div className={`absolute -right-10 -top-10 w-32 h-32 bg-${feat.color}-500/20 rounded-full blur-[40px] group-hover:bg-${feat.color}-500/30 transition-colors`}></div>
                
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-${feat.color}-500/20 text-${feat.color}-400 group-hover:scale-110 transition-transform duration-500`}>
                   <feat.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 relative z-10">{feat.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm relative z-10">{feat.desc}</p>
             </motion.div>
           ))}
        </motion.div>
      </div>

      {/* About Section */}
      <div id="about" className="py-24 px-4 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
           <motion.div 
             initial={{ opacity: 0, x: -50 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8 }}
             className="w-full lg:w-1/2 relative"
           >
              <div className="aspect-[4/3] rounded-[3rem] overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] group">
                 {data.banner ? (
                   <img src={data.banner} alt="About" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                 ) : (
                   <div className="w-full h-full bg-white/5 flex items-center justify-center"><GraduationCap size={100} className="text-white/10" /></div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                 <div className="absolute inset-0 border border-white/20 rounded-[3rem] pointer-events-none"></div>
              </div>
              
              {/* Floating Stat Card with Animation */}
              <motion.div 
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-8 -right-8 md:-bottom-10 md:-right-10 bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-2xl"
              >
                 <p className="text-4xl md:text-5xl font-black text-white mb-1 tracking-tighter">100%</p>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Commitment</p>
              </motion.div>
           </motion.div>
           
           <motion.div 
             initial="hidden"
             whileInView="visible"
             viewport={{ once: true }}
             variants={staggerContainer}
             className="w-full lg:w-1/2"
           >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-gray-300 mb-6">
                 About Us
              </motion.div>
              <motion.h3 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 text-white tracking-tighter leading-tight">
                 Discover Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">Story</span>
              </motion.h3>
              <motion.p variants={fadeUp} className="text-gray-400 text-base md:text-lg leading-relaxed mb-10">
                {data.about || "About text goes here..."}
              </motion.p>
              
              <motion.div variants={fadeUp} className="grid grid-cols-2 gap-6">
                 <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <h4 className="text-white font-black text-xl mb-2">Vision</h4>
                    <p className="text-sm text-gray-400">To inspire, educate, and empower the next generation.</p>
                 </div>
                 <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <h4 className="text-white font-black text-xl mb-2">Mission</h4>
                    <p className="text-sm text-gray-400">Excellence in every step, fostering innovation.</p>
                 </div>
              </motion.div>
           </motion.div>
        </div>
      </div>

      {/* Events & Gallery - Masonry / Hover Effects */}
      <div id="gallery" className="py-24 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
             <h3 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 text-white tracking-tighter">Campus Life</h3>
             <p className="text-gray-400 text-lg">Glimpses of our vibrant community.</p>
          </motion.div>

          {(!data.events || data.events.length === 0) ? (
            <div className="text-center text-gray-500 font-bold py-20 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-md">
               No memories posted yet.
            </div>
          ) : (
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {data.events.map((ev, i) => (
                <motion.div
                  variants={fadeUp}
                  key={i}
                  className="group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-white/10 aspect-[4/5] cursor-pointer"
                >
                  {ev.url ? (
                    <img
                      src={ev.url}
                      alt={ev.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={64} className="text-white/10" />
                    </div>
                  )}
                  {/* Advanced Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500"></div>
                  
                  {/* Content appearing on hover */}
                  <div className="absolute inset-0 p-8 flex flex-col justify-end translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="flex items-center gap-2 text-xs font-bold text-white/80 mb-3 uppercase tracking-widest bg-black/40 backdrop-blur-md self-start px-3 py-1.5 rounded-full">
                      <Calendar size={14} /> {ev.date}
                    </div>
                    <h4 className="text-2xl md:text-3xl font-black mb-3 text-white leading-tight">{ev.title || "Event Title"}</h4>
                    <p className="text-gray-300 text-sm line-clamp-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 leading-relaxed">
                      {ev.desc}
                    </p>
                  </div>
                  
                  {/* Icon Indicator */}
                  <div className="absolute top-6 right-6 w-12 h-12 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200">
                     {ev.type === 'video' ? <Video size={20}/> : <ImageIcon size={20}/>}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Advanced Contact Section */}
      <div id="contact" className="py-24 px-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-[3rem] p-8 md:p-16 backdrop-blur-2xl relative overflow-hidden shadow-2xl"
        >
          {/* Decorative blur */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-black/40 blur-[100px] rounded-full pointer-events-none"></div>
          
          <div className="text-center mb-16 relative z-10">
             <h3 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 text-white tracking-tighter">Get in Touch</h3>
             <p className="text-gray-400 text-lg">We'd love to hear from you.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {[
              { icon: Phone, title: "Phone", val: data.phone },
              { icon: Mail, title: "Email", val: data.email },
              { icon: MapPin, title: "Address", val: data.address }
            ].map((contact, i) => (
               <motion.div 
                 key={i}
                 whileHover={{ y: -5 }}
                 className="flex flex-col items-center text-center p-8 rounded-3xl bg-black/40 border border-white/5 hover:bg-black/60 transition-colors shadow-xl"
               >
                 <div
                   className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                   style={themeStyle}
                 >
                   <contact.icon size={24} />
                 </div>
                 <h4 className="font-bold text-white mb-2 text-lg uppercase tracking-wider">{contact.title}</h4>
                 <p className="text-gray-400 text-sm">{contact.val || "N/A"}</p>
               </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="py-12 text-center border-t border-white/10 relative z-10 bg-black/80">
        <p className="text-gray-500 font-medium text-xs md:text-sm mb-2">
          © {new Date().getFullYear()} {data.name || "School Name"}. All Rights Reserved.
        </p>
        <p className="text-gray-600 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em]">
          Powered by <span className="text-white">TaleemiDunya Pro</span>
        </p>
      </footer>
    </div>
  );
};

export default SchoolWebsiteView;
