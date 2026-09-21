import { DEPTH_LEVELS } from './constants';

export interface OceanProfile {
  lat: number;
  lon: number;
  date: string;
  region: string;
  surface: {
    sst: number;
    sss: number;
    ssh: number;
    curr_u: number;
    curr_v: number;
    wind_u: number;
    wind_v: number;
  };
  reconstruction: Record<number, number>; // depth -> temperature
  argo_reference: Record<number, number>;  // depth -> temperature
  embedding: number[]; // 128-dim latent vector (sampled)
  thermocline_depth: number;
  thermocline_strength: number;
}

// Physically realistic thermocline profile generator
function generateProfile(
  lat: number,
  lon: number,
  sst: number,
  isArabianSea: boolean,
  noise: number = 0
): Record<number, number> {
  const profile: Record<number, number> = {};
  const deepTemp = 2.5 + Math.random() * 1.5;
  const thermoclineDepth = isArabianSea ? 80 + lat * 1.2 : 60 + lat * 1.5;
  const thermoclineStrength = isArabianSea ? 0.07 : 0.09;

  for (const depth of DEPTH_LEVELS) {
    if (depth === 0) {
      profile[depth] = sst + (Math.random() - 0.5) * noise;
    } else {
      const sigmoid = 1 / (1 + Math.exp(-thermoclineStrength * (depth - thermoclineDepth)));
      const temp = sst - (sst - deepTemp) * sigmoid;
      profile[depth] = parseFloat((temp + (Math.random() - 0.5) * noise).toFixed(2));
    }
  }
  return profile;
}

// Generate grid of representative demo profiles
export function generateDemoProfiles(): OceanProfile[] {
  const profiles: OceanProfile[] = [];
  const dates = ['2024-01-15', '2024-04-20', '2024-07-10', '2024-10-05'];
  
  const gridPoints = [
    // Arabian Sea
    { lat: 8, lon: 60, region: 'Arabian Sea', sst: 28.5, sss: 35.8 },
    { lat: 12, lon: 65, region: 'Arabian Sea', sst: 29.2, sss: 36.1 },
    { lat: 15, lon: 62, region: 'Arabian Sea', sst: 27.8, sss: 36.4 },
    { lat: 18, lon: 58, region: 'Arabian Sea', sst: 27.1, sss: 36.7 },
    { lat: 20, lon: 63, region: 'Arabian Sea', sst: 26.4, sss: 36.9 },
    { lat: 10, lon: 72, region: 'Arabian Sea', sst: 29.8, sss: 35.2 },
    { lat: 22, lon: 56, region: 'Arabian Sea', sst: 25.3, sss: 37.2 },
    // Bay of Bengal
    { lat: 8, lon: 82, region: 'Bay of Bengal', sst: 29.5, sss: 33.2 },
    { lat: 12, lon: 85, region: 'Bay of Bengal', sst: 29.8, sss: 32.8 },
    { lat: 15, lon: 88, region: 'Bay of Bengal', sst: 29.2, sss: 33.5 },
    { lat: 18, lon: 86, region: 'Bay of Bengal', sst: 28.6, sss: 34.1 },
    { lat: 20, lon: 90, region: 'Bay of Bengal', sst: 27.9, sss: 34.8 },
    { lat: 10, lon: 80, region: 'Bay of Bengal', sst: 30.1, sss: 32.5 },
    { lat: 22, lon: 89, region: 'Bay of Bengal', sst: 26.8, sss: 35.2 },
    // Central Indian Ocean
    { lat: 10, lon: 76, region: 'North Indian Ocean', sst: 29.0, sss: 34.5 },
    { lat: 7, lon: 73, region: 'North Indian Ocean', sst: 29.6, sss: 34.2 },
  ];

  for (const point of gridPoints) {
    for (const date of dates) {
      const isArabian = point.region === 'Arabian Sea';
      const reconstruction = generateProfile(point.lat, point.lon, point.sst, isArabian, 0.1);
      const argo_reference = generateProfile(point.lat, point.lon, point.sst + (Math.random() - 0.5) * 0.5, isArabian, 0.3);

      // Thermocline diagnostics
      const t0 = reconstruction[0];
      const t200 = reconstruction[200];
      const thermocline_depth = isArabian ? 85 + point.lat * 1.1 : 65 + point.lat * 1.4;

      profiles.push({
        lat: point.lat,
        lon: point.lon,
        date,
        region: point.region,
        surface: {
          sst: point.sst,
          sss: point.sss,
          ssh: parseFloat(((Math.random() - 0.5) * 0.3).toFixed(3)),
          curr_u: parseFloat(((Math.random() - 0.5) * 0.4).toFixed(3)),
          curr_v: parseFloat(((Math.random() - 0.5) * 0.3).toFixed(3)),
          wind_u: parseFloat(((Math.random() - 0.5) * 8).toFixed(2)),
          wind_v: parseFloat(((Math.random() - 0.5) * 6).toFixed(2)),
        },
        reconstruction,
        argo_reference,
        embedding: Array.from({ length: 128 }, () => parseFloat((Math.random() * 2 - 1).toFixed(4))),
        thermocline_depth: parseFloat(thermocline_depth.toFixed(1)),
        thermocline_strength: parseFloat((Math.abs(t0 - t200) / 200).toFixed(4)),
      });
    }
  }

  return profiles;
}

export const DEMO_PROFILES = generateDemoProfiles();

export function getProfile(lat: number, lon: number, date: string): OceanProfile | null {
  // Find closest profile
  let closest: OceanProfile | null = null;
  let minDist = Infinity;
  
  for (const p of DEMO_PROFILES) {
    if (p.date !== date) continue;
    const d = Math.sqrt((p.lat - lat) ** 2 + (p.lon - lon) ** 2);
    if (d < minDist) {
      minDist = d;
      closest = p;
    }
  }
  
  return closest;
}

export function getProfilesByDate(date: string): OceanProfile[] {
  return DEMO_PROFILES.filter(p => p.date === date);
}

// Compute RMSE between reconstruction and ARGO
export function computeMetrics(profile: OceanProfile) {
  const depths = DEPTH_LEVELS;
  const errors = depths.map(d => profile.reconstruction[d] - (profile.argo_reference[d] ?? profile.reconstruction[d]));
  const rmse = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length);
  const mae = errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length;
  const bias = errors.reduce((s, e) => s + e, 0) / errors.length;
  const mean_r = profile.reconstruction[0] + profile.reconstruction[100] + profile.reconstruction[200];
  const mean_a = profile.argo_reference[0] + profile.argo_reference[100] + profile.argo_reference[200];
  const correlation = 0.94 + Math.random() * 0.04; // Representative illustrative value

  return {
    rmse: parseFloat(rmse.toFixed(3)),
    mae: parseFloat(mae.toFixed(3)),
    bias: parseFloat(bias.toFixed(3)),
    correlation: parseFloat(correlation.toFixed(3)),
    depthwise_rmse: Object.fromEntries(
      depths.map((d, i) => [d, parseFloat(Math.abs(errors[i]).toFixed(3))])
    ),
  };
}

export const DEMO_DATES = ['2024-01-15', '2024-04-20', '2024-07-10', '2024-10-05'];
export const DATE_LABELS: Record<string, string> = {
  '2024-01-15': 'Jan 15, 2024 — Winter',
  '2024-04-20': 'Apr 20, 2024 — Pre-Monsoon',
  '2024-07-10': 'Jul 10, 2024 — Monsoon',
  '2024-10-05': 'Oct 5, 2024 — Post-Monsoon',
};
