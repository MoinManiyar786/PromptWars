import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, Medal, Star } from 'lucide-react';

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/leaderboard');
        setLeaders(response.data);
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
    // Refresh every 30s
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel p-6 mt-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-yellow-400">
        <Trophy /> Global Rankings
      </h2>
      
      {loading ? (
        <div className="text-gray-400 animate-pulse">Loading rankings...</div>
      ) : leaders.length === 0 ? (
        <div className="text-gray-400">No explorers yet. Be the first!</div>
      ) : (
        <div className="space-y-4">
          {leaders.map((player, index) => (
            <div 
              key={index} 
              className={`flex items-center justify-between p-4 rounded-lg bg-white/5 border ${index === 0 ? 'border-yellow-500/50' : 'border-white/10'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`font-bold w-6 flex justify-center ${
                  index === 0 ? 'text-yellow-400' : 
                  index === 1 ? 'text-gray-300' : 
                  index === 2 ? 'text-orange-400' : 'text-gray-500'
                }`}>
                  {index < 3 ? <Medal size={20} /> : `#${index + 1}`}
                </div>
                <div className="font-semibold text-white">{player.username}</div>
              </div>
              <div className="font-bold text-blue-400 flex items-center gap-1">
                {player.total_score} <Star size={14} className="text-yellow-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
