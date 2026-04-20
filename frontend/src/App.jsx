import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Rocket } from 'lucide-react';
import CheckIn from './components/CheckIn';
import Leaderboard from './components/Leaderboard';
import Map from './components/Map';

function App() {
  const [playerLocation, setPlayerLocation] = useState(null);
  const [targetLocation, setTargetLocation] = useState(null);
  const [username, setUsername] = useState(() => localStorage.getItem('gd_username') || '');
  const [tempName, setTempName] = useState(username);
  const [locationError, setLocationError] = useState('');
  const [timeUntilReset, setTimeUntilReset] = useState('');

  // Calculate time until next market open (simulated as next 9:30 AM ET or just next midnight for simplicity)
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0); // Next midnight
      const diff = tomorrow - now;
      
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeUntilReset(`${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTarget = async (lat, lon) => {
    try {
      const response = await axios.get(`https://gravitydrop-backend-779341243440.us-central1.run.app/api/today?lat=${lat}&lon=${lon}`);
      setTargetLocation({ lat: response.data.target_lat, lon: response.data.target_lon });
    } catch (error) {
      console.error("Failed to fetch target:", error);
    }
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lon: position.coords.longitude };
          setPlayerLocation(loc);
          fetchTarget(loc.lat, loc.lon);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError("Location disabled. Using Demo Mode (San Francisco).");
          const fallback = { lat: 37.7749, lon: -122.4194 };
          setPlayerLocation(fallback);
          fetchTarget(fallback.lat, fallback.lon);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
    }
  }, []);

  // Keyboard Event Listener for Demo Mode (WASD or Arrows to move)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!playerLocation) return;
      
      // Move by ~10 meters per keypress (roughly 0.0001 degrees)
      const moveAmount = 0.0001; 
      
      setPlayerLocation(prev => {
        if (!prev) return prev;
        let newLat = prev.lat;
        let newLon = prev.lon;
        
        switch(e.key.toLowerCase()) {
          case 'w': case 'arrowup': newLat += moveAmount; break;
          case 's': case 'arrowdown': newLat -= moveAmount; break;
          case 'a': case 'arrowleft': newLon -= moveAmount; break;
          case 'd': case 'arrowright': newLon += moveAmount; break;
          default: return prev; // Do nothing if not a movement key
        }
        return { lat: newLat, lon: newLon };
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerLocation]);

  const handleSaveUsername = () => {
    if (tempName.trim()) {
      setUsername(tempName.trim());
      localStorage.setItem('gd_username', tempName.trim());
    }
  };

  const handleCheckinComplete = () => {
    // Optionally trigger a leaderboard refresh or show a celebration
  };

  return (
    <main className="min-h-screen text-white p-4 md:p-8 max-w-4xl mx-auto relative z-10" aria-label="GravityDrop Main Application">
      <header className="mb-8 text-center flex flex-col items-center relative">
        <div className="absolute right-0 top-0 hidden md:flex flex-col items-end bg-white/5 px-4 py-2 rounded-lg border border-white/10" aria-label="Next Target Countdown">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Next Target In</span>
          <span className="font-mono text-yellow-400 font-bold tabular-nums">{timeUntilReset}</span>
        </div>
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30" aria-hidden="true">
          <Rocket size={32} className="text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
          GravityDrop
        </h1>
        <p className="text-gray-400 mt-2">Defy gravity. Explore the world.</p>
        <div className="md:hidden mt-4 flex flex-col items-center bg-white/5 px-4 py-2 rounded-lg border border-white/10" aria-label="Next Target Countdown">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Next Target In</span>
          <span className="font-mono text-yellow-400 font-bold tabular-nums">{timeUntilReset}</span>
        </div>
      </header>

      {!username ? (
        <section className="glass-panel p-8 text-center max-w-md mx-auto" aria-labelledby="login-heading">
          <h2 id="login-heading" className="text-2xl font-bold mb-4">Enter your Call Sign</h2>
          <label htmlFor="username-input" className="sr-only">Call Sign</label>
          <input 
            id="username-input"
            type="text" 
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white mb-4 outline-none focus:border-blue-500 transition-colors"
            placeholder="e.g. AstroExplorer"
            value={tempName}
            onChange={e => setTempName(e.target.value)}
            aria-required="true"
          />
          <button 
            onClick={handleSaveUsername}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold transition-transform hover:scale-105 active:scale-95"
            aria-label="Start Mission"
          >
            Start Mission
          </button>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-6" aria-label="Mission Dashboard">
            <article className="glass-panel p-4">
              <header className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-xl">Sector Map</h2>
                <span className="bg-white/10 px-3 py-1 rounded-full text-sm text-gray-300" aria-label={`Logged in as ${username}`}>
                  {username}
                </span>
              </header>
              <div className="mb-4 space-y-2">
                {locationError && <p className="text-red-400 text-sm" role="alert">{locationError}</p>}
                <p className="text-xs text-blue-300 bg-blue-900/20 p-2 rounded border border-blue-500/30 flex items-center gap-2" role="note">
                  <span className="font-bold">DEMO MODE:</span> Use W, A, S, D or Arrow Keys to move your pin.
                </p>
              </div>
              
              <Map playerLocation={playerLocation} targetLocation={targetLocation} />
            </article>
            
            <CheckIn 
              playerLocation={playerLocation} 
              username={username} 
              onCheckinComplete={handleCheckinComplete} 
            />
          </section>
          
          <aside className="lg:col-span-1" aria-label="Leaderboard Sidebar">
            <Leaderboard />
          </aside>
        </div>
      )}
    </main>
  );
}

export default App;
