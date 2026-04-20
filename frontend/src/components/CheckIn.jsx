import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Loader, Star, Check } from 'lucide-react';

const CheckIn = ({ playerLocation, username, onCheckinComplete }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState([]);

  const handleCheckIn = async () => {
    if (!playerLocation || !username) {
      alert("Please ensure your location is enabled and you have set a username.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('https://gravitydrop-backend-779341243440.us-central1.run.app/api/checkin', {
        username: username,
        lat: playerLocation.lat,
        lon: playerLocation.lon
      });
      
      const data = response.data;
      
      // Calculate Badges
      const badges = [];
      if (data.score >= 500 && data.score < 1000) badges.push({ name: "Close Encounter", color: "text-blue-400" });
      if (data.score === 1000) badges.push({ name: "Bullseye", color: "text-yellow-400" });
      if (data.distance_m > 50000) badges.push({ name: "Long Haul", color: "text-purple-400" });
      
      setEarnedBadges(badges);
      setResult(data);
      setCopied(false);
      onCheckinComplete();
    } catch (error) {
      console.error("Checkin failed:", error);
      alert("Failed to check in. Is the backend running?");
    }
    setLoading(false);
  };

  const handleShare = () => {
    const text = `🛸 GravityDrop Mission Debrief\n\nCall Sign: ${username}\nDistance: ${Math.round(result.distance_m)}m\nScore: +${result.score} pts\n\n${earnedBadges.length > 0 ? `Badges: ${earnedBadges.map(b => b.name).join(', ')}\n` : ''}Can you beat my drop? Play at: https://gravitydrop-frontend-779341243440.us-central1.run.app`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <section className="glass-panel p-6 mt-6" aria-label="Mission Control Panel">
      <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
        Mission Control
      </h2>
      
      <AnimatePresence mode="wait">
        {result ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-900/80 border border-white/10 p-6 rounded-xl text-center shadow-xl shadow-blue-900/20"
            role="alert"
          >
            <div className="flex justify-center mb-2">
              <Check size={40} className="text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Debriefing Complete</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Target Distance</p>
                <p className="text-white font-mono text-xl">{Math.round(result.distance_m)}<span className="text-sm text-gray-500">m</span></p>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Points Secured</p>
                <p className="text-yellow-400 font-black text-xl">+{result.score}</p>
              </div>
            </div>

            {earnedBadges.length > 0 && (
              <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Badges Earned</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  {earnedBadges.map((badge, idx) => (
                    <motion.div 
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + (idx * 0.1) }}
                      key={idx} className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full text-sm font-bold border border-white/5"
                    >
                      <Star size={16} className={badge.color} />
                      <span className="text-white">{badge.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={handleShare}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                aria-label="Share Results"
              >
                <Star size={18} /> {copied ? "Copied!" : "Share Debrief"}
              </button>
              <button 
                onClick={() => setResult(null)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-colors"
                aria-label="Check in again"
              >
                Scan Again
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-gray-400">Navigate as close as possible to the target and drop your beacon to earn points.</p>
            
            <button
              onClick={handleCheckIn}
              disabled={loading || !playerLocation}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:pointer-events-none"
              aria-label={loading ? "Scanning Area" : "Drop Beacon & Score"}
            >
              {loading ? <Loader className="animate-spin" /> : <MapPin />}
              {loading ? "Scanning Area..." : "Drop Beacon & Score"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default CheckIn;
