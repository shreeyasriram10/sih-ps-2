// OceanEmbed Constants

export const DEPTH_LEVELS = [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000];

export const REGIONS = {
  ARABIAN_SEA: {
    name: 'Arabian Sea',
    lat: [5, 25],
    lon: [45, 78],
    center: { lat: 15, lon: 65 },
    color: '#0ea5e9',
  },
  BAY_OF_BENGAL: {
    name: 'Bay of Bengal',
    lat: [5, 25],
    lon: [78, 100],
    center: { lat: 14, lon: 87 },
    color: '#06b6d4',
  },
  FULL_DOMAIN: {
    name: 'North Indian Ocean',
    lat: [5, 30],
    lon: [45, 105],
    center: { lat: 17, lon: 75 },
    color: '#22d3ee',
  },
};

export const INPUT_VARIABLES = [
  { id: 'sst', label: 'SST', fullName: 'Sea Surface Temperature', unit: '°C', color: '#f97316' },
  { id: 'sss', label: 'SSS', fullName: 'Sea Surface Salinity', unit: 'PSU', color: '#a855f7' },
  { id: 'ssh', label: 'SSH/SLA', fullName: 'Sea Surface Height Anomaly', unit: 'm', color: '#3b82f6' },
  { id: 'curr_u', label: 'Current U', fullName: 'Zonal Current', unit: 'm/s', color: '#22c55e' },
  { id: 'curr_v', label: 'Current V', fullName: 'Meridional Current', unit: 'm/s', color: '#84cc16' },
  { id: 'wind_u', label: 'Wind U', fullName: 'Zonal Wind', unit: 'm/s', color: '#eab308' },
  { id: 'wind_v', label: 'Wind V', fullName: 'Meridional Wind', unit: 'm/s', color: '#f59e0b' },
];

export const DATA_SOURCES = [
  { variable: 'SST', source: 'OSTIA', nativeRes: '0.05°', targetRes: '0.25°', freq: 'Daily', status: 'READY' },
  { variable: 'SSS', source: 'SMAP / SMOS', nativeRes: '0.125°', targetRes: '0.25°', freq: 'Daily', status: 'READY' },
  { variable: 'SSH / SLA', source: 'DUACS (AVISO+)', nativeRes: '0.25°', targetRes: '0.25°', freq: 'Daily', status: 'READY' },
  { variable: 'Currents U/V', source: 'OSCAR', nativeRes: '0.25°', targetRes: '0.25°', freq: 'Daily', status: 'READY' },
  { variable: 'Winds U/V', source: 'ASCAT / CCMP', nativeRes: '0.25°', targetRes: '0.25°', freq: 'Daily', status: 'READY' },
  { variable: 'Target (T)', source: 'GLORYS12 Reanalysis', nativeRes: '0.083°', targetRes: '0.25°', freq: 'Daily', status: 'READY' },
  { variable: 'Validation', source: 'ARGO / INCOIS Gridded', nativeRes: 'Profile', targetRes: '0.25°', freq: 'Per float', status: 'READY' },
];

export const MODEL_VERSION = 'OceanEmbed-v1.0-DEMO';
export const SPATIAL_RESOLUTION = '0.25°';
export const TEMPORAL_RESOLUTION = 'Daily';
export const LATENT_DIM = 128;

export const NAV_ITEMS = [
  { href: '/home', label: 'Mission', short: 'Home' },
  { href: '/command-center', label: 'Command Center', short: 'Command' },
  { href: '/harmonization', label: 'Data Harmonization', short: 'Data' },
  { href: '/embedding', label: 'Embedding Engine', short: 'Embedding' },
  { href: '/reconstruction', label: 'Reconstruction Lab', short: 'Reconstruct' },
  { href: '/ocean-3d', label: '3D Explorer', short: '3D' },
  { href: '/validation', label: 'ARGO Validation', short: 'ARGO' },
  { href: '/performance', label: 'Performance', short: 'Performance' },
  { href: '/insights', label: 'Insights', short: 'Insights' },
  { href: '/backend', label: 'Backend & ML', short: 'Backend' },
  { href: '/about', label: 'Architecture', short: 'About' },
];
