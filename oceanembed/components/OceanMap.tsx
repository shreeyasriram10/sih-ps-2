'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OceanProfile } from '@/lib/ocean-simulation';

interface OceanMapProps {
  profiles: OceanProfile[];
  selectedProfile: OceanProfile | null;
  activeLayer: string;
  onSelectLocation: (lat: number, lon: number) => void;
  selectedRegion: string;
}

// Color scale for ocean temperature (Vibrant Light Ocean palette)
function tempToColor(temp: number, min = 2, max = 31): string {
  const t = Math.max(0, Math.min(1, (temp - min) / (max - min)));
  if (t < 0.2) return '#0284c7'; // Deep blue
  if (t < 0.4) return '#06b6d4'; // Cyan
  if (t < 0.6) return '#10b981'; // Emerald
  if (t < 0.8) return '#f59e0b'; // Amber
  return '#ef4444'; // Coral red
}

export default function OceanMap({
  profiles,
  selectedProfile,
  activeLayer,
  onSelectLocation,
  selectedRegion,
}: OceanMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on North Indian Ocean (15°N, 75°E)
    const map = L.map(mapContainerRef.current, {
      center: [15, 75],
      zoom: 4,
      minZoom: 3,
      maxZoom: 10,
      zoomControl: true,
    });

    // Premium Esri World Ocean Basemap (100% Free, NO API KEY REQUIRED, dedicated oceanography tiles)
    const oceanTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri, GEBCO, NOAA, National Geographic, DeLorme, HERE | INCOIS Data Feed',
      maxZoom: 13,
    });

    // Ocean Reference Labels (Graticules & Ocean Names)
    const oceanLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 13,
      opacity: 0.85,
    });

    // Fallback OpenStreetMap Voyager / Standard layer if needed
    const osmTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    });

    // Add Esri Ocean layers to Map
    oceanTiles.addTo(map);
    oceanLabels.addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Click handler on map
    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(2));
      const lon = Number(e.latlng.lng.toFixed(2));
      onSelectLocation(lat, lon);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update bounds on Region change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedRegion === 'ARABIAN_SEA') {
      map.flyTo([15, 65], 5, { duration: 1.2 });
    } else if (selectedRegion === 'BAY_OF_BENGAL') {
      map.flyTo([14, 88], 5, { duration: 1.2 });
    } else {
      map.flyTo([15, 75], 4, { duration: 1.2 });
    }
  }, [selectedRegion]);

  // Render Profiles & Dynamic Overlay
  useEffect(() => {
    const layerGroup = layerGroupRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();

    profiles.forEach((p) => {
      const isSelected = selectedProfile?.lat === p.lat && selectedProfile?.lon === p.lon;

      let value = p.surface.sst;
      let unit = '°C';
      if (activeLayer === 'SSS') {
        value = p.surface.sss;
        unit = 'PSU';
      } else if (activeLayer === 'SSH/SLA') {
        value = p.surface.ssh;
        unit = 'm';
      } else if (activeLayer === 'RECONSTRUCTED T') {
        value = p.reconstruction[50] || p.surface.sst;
        unit = '°C';
      }

      const color = tempToColor(value, activeLayer === 'SSS' ? 32 : 2, activeLayer === 'SSS' ? 37 : 31);

      // Render glowing ocean observation markers
      const circle = L.circleMarker([p.lat, p.lon], {
        radius: isSelected ? 13 : 9,
        fillColor: color,
        color: isSelected ? '#0284c7' : '#ffffff',
        weight: isSelected ? 3.5 : 2,
        opacity: 1,
        fillOpacity: isSelected ? 0.95 : 0.75,
      });

      // HTML Popup with Premium Light Ocean styling
      const popupHtml = `
        <div style="font-family: 'Inter', sans-serif; padding: 6px; min-width: 170px;">
          <div style="font-size: 10px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2px;">
            ${p.region}
          </div>
          <div style="font-size: 14px; font-weight: 900; color: #0c4a6e; margin-bottom: 8px; border-bottom: 1px solid rgba(14,116,163,0.15); padding-bottom: 4px;">
            📍 ${p.lat}°N, ${p.lon}°E
          </div>
          <div style="font-size: 11px; color: #334155; line-height: 1.6;">
            <div style="display:flex; justify-content:space-between;"><span>SST (Surface):</span> <strong style="color:#0284c7;">${p.surface.sst.toFixed(2)} °C</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>SSS (Salinity):</span> <strong style="color:#0d9488;">${p.surface.sss.toFixed(2)} PSU</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>SSH (Anomaly):</span> <strong style="color:#7c3aed;">${p.surface.ssh.toFixed(2)} m</strong></div>
            <div style="display:flex; justify-content:space-between; margin-top:4px; padding-top:4px; border-top:1px dashed #cbd5e1;"><span>T at 100m:</span> <strong style="color:#ea580c;">${p.reconstruction[100]?.toFixed(2) ?? '--'} °C</strong></div>
          </div>
        </div>
      `;

      circle.bindPopup(popupHtml);

      circle.on('click', () => {
        onSelectLocation(p.lat, p.lon);
      });

      layerGroup.addLayer(circle);

      // Pulse ring animation for selected marker
      if (isSelected) {
        const pulse = L.circle([p.lat, p.lon], {
          radius: 40000,
          color: '#0284c7',
          fillColor: '#06b6d4',
          fillOpacity: 0.25,
          weight: 2,
        });
        layerGroup.addLayer(pulse);
      }
    });
  }, [profiles, selectedProfile, activeLayer, onSelectLocation]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-inner border border-sky-200/80">
      <div ref={mapContainerRef} className="w-full h-full min-h-[440px]" />
      
      {/* Map Header Legend Badge */}
      <div className="absolute top-3 right-3 z-[1000] glass-strong px-3.5 py-1.5 rounded-xl border border-sky-300/50 text-[10px] font-extrabold text-sky-950 shadow-md flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
        NOAA / Esri World Ocean Basemap · INCOIS Data Telemetry
      </div>
    </div>
  );
}
