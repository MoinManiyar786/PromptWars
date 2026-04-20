import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const customTargetIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const Map = ({ playerLocation, targetLocation }) => {
  if (!playerLocation) return <div className="h-64 flex items-center justify-center text-gray-400">Locating...</div>;

  const center = [playerLocation.lat, playerLocation.lon];

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden glass-panel relative">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Player Location */}
        <Marker position={center}>
          <Popup>You are here</Popup>
        </Marker>
        <Circle center={center} radius={100} pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.2 }} />

        {/* Target Location */}
        {targetLocation && (
          <Marker position={[targetLocation.lat, targetLocation.lon]} icon={customTargetIcon}>
            <Popup>Today's Target</Popup>
          </Marker>
        )}
        {targetLocation && (
          <Circle 
            center={[targetLocation.lat, targetLocation.lon]} 
            radius={50} 
            pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.4 }} 
          />
        )}
      </MapContainer>
    </div>
  );
};

export default Map;
