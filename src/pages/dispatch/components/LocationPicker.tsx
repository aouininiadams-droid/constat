import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Loader2, Search, MapPin, CheckCircle2 } from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icon in Leaflet
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
  onSelect: (location: { lat: number; lng: number; address: string }) => void;
}

function LocationMarker({ position, setPosition, setAddress }: { 
  position: L.LatLng | null, 
  setPosition: (pos: L.LatLng) => void,
  setAddress: (addr: string) => void
}) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      fetchAddress(e.latlng.lat, e.latlng.lng, setAddress);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

async function fetchAddress(lat: number, lng: number, setAddress: (addr: string) => void) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    setAddress(data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
  } catch (err) {
    setAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
  }
}

export default function LocationPicker({ onSelect }: Props) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newPos = new L.LatLng(parseFloat(lat), parseFloat(lon));
        setPosition(newPos);
        setAddress(display_name);
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    if (position) {
      onSelect({
        lat: position.lat,
        lng: position.lng,
        address: address || `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`
      });
    }
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className="p-4 bg-white border-b z-20">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-10 pr-12 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            placeholder="Rechercher une adresse ou une ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            </div>
          )}
        </form>
      </div>

      <div className="flex-1 relative z-10">
        <MapContainer 
          center={[34.0209, -6.8416]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            position={position} 
            setPosition={setPosition} 
            setAddress={setAddress} 
          />
        </MapContainer>
      </div>

      {position && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 z-20 animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Position Sélectionnée</p>
              <p className="text-sm font-semibold text-slate-800 line-clamp-2">{address || 'Chargement de l\'adresse...'}</p>
            </div>
          </div>
          <button
            onClick={handleConfirm}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            Confirmer la Position
          </button>
        </div>
      )}

      {!position && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur-sm z-20">
          Cliquez n'importe où sur la carte pour sélectionner
        </div>
      )}
    </div>
  );
}
