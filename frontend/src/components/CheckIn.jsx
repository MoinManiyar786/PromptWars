import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { MapPin, Camera, Loader } from 'lucide-react';

const CheckIn = ({ playerLocation, username, onCheckinComplete }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheckIn = async () => {
    if (!playerLocation || !username) {
      alert("Please ensure your location is enabled and you have set a username.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/checkin', {
        username: username,
        lat: playerLocation.lat,
        lon: playerLocation.lon
      });
      
      setResult(response.data);
      onCheckinComplete();
    } catch (error) {
      console.error("Checkin failed:", error);
      alert("Failed to check in. Is the backend running?");
    }
    setLoading(false);
  };

  return (
    <div className="glass-panel p-6 mt-6">
      <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
        Mission Control
      </h2>
      
      {result ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-900/40 border border-green-500/30 p-4 rounded-lg text-center"
        >
          <h3 className="text-xl font-bold text-green-400 mb-2">Check-in Successful!</h3>
          <p className="text-gray-300">Distance: <span className="text-white font-bold">{Math.round(result.distance_m)}m</span></p>
          <p className="text-gray-300 mb-4">Score: <span className="text-yellow-400 font-bold text-2xl">+{result.score}</span></p>
          <button 
            onClick={() => setResult(null)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Check in again
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-400">Get as close as possible to the target and drop your beacon to earn points.</p>
          
          <button
            onClick={handleCheckIn}
            disabled={loading || !playerLocation}
            className="w-full py-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            {loading ? <Loader className="animate-spin" /> : <MapPin />}
            {loading ? "Calculating..." : "Drop Beacon & Score"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CheckIn;
