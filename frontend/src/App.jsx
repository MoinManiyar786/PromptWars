import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Rocket } from 'lucide-react';
import Map from './components/Map';
import CheckIn from './components/CheckIn';
import Leaderboard from './components/Leaderboard';

function App() {
  const [playerLocation, setPlayerLocation] = useState(null);
  const [targetLocation, setTargetLocation] = useState(null);
  const [username, setUsername] = useState(() => localStorage.getItem('gd_username') || '');
  const [tempName, setTempName] = useState(username);
  const [locationError, setLocationError] = useState('');

  const fetchTarget = async (lat, lon) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/today?lat=${lat}&lon=${lon}`);
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
          setLocationError("Enable location access to play.");
          // Fallback for testing: San Francisco
          const fallback = { lat: 37.7749, lon: -122.4194 };
          setPlayerLocation(fallback);
          fetchTarget(fallback.lat, fallback.lon);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
    }
  }, []);

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
    <div className="min-h-screen text-white p-4 md:p-8 max-w-4xl mx-auto relative z-10">
      <header className="mb-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
          <Rocket size={32} className="text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
          GravityDrop
        </h1>
        <p className="text-gray-400 mt-2">Defy gravity. Explore the world.</p>
      </header>

      {!username ? (
        <div className="glass-panel p-8 text-center max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-4">Enter your Call Sign</h2>
          <input 
            type="text" 
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white mb-4 outline-none focus:border-blue-500"
            placeholder="e.g. AstroExplorer"
            value={tempName}
            onChange={e => setTempName(e.target.value)}
          />
          <button 
            onClick={handleSaveUsername}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold transition-colors"
          >
            Start Mission
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-xl">Sector Map</h2>
                <span className="bg-white/10 px-3 py-1 rounded-full text-sm text-gray-300">
                  {username}
                </span>
              </div>
              {locationError && <p className="text-red-400 text-sm mb-4">{locationError} (Using default location)</p>}
              <Map playerLocation={playerLocation} targetLocation={targetLocation} />
            </div>
            
            <CheckIn 
              playerLocation={playerLocation} 
              username={username} 
              onCheckinComplete={handleCheckinComplete} 
            />
          </div>
          
          <div className="lg:col-span-1">
            <Leaderboard />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
