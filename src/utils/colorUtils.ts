// src/utils/colorUtils.ts - Utilities for color conversion and material mapping based on pixel data.
import { MaterialType } from '../types/game';

/**
 * Determines the material type and base HP for a pixel based on its RGB values.
 * Follows the game's aesthetic rules:
 * - Saturation < 20% -> CONCRETE
 * - Blue/Cyan spectrum [160, 260] -> GLASS
 * - Brown spectrum [20, 50] with low saturation -> WOOD
 * - Red/Orange spectrum (H < 60 or H > 330) -> COPPER
 */
export function determineMaterialFromRGB(r: number, g: number, b: number): { material: MaterialType; hp: number } {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf: h = (gf - bf) / d + (gf < bf ? 6 : 0); break;
      case gf: h = (bf - rf) / d + 2; break;
      case bf: h = (rf - gf) / d + 4; break;
    }
    h *= 60;
  }

  // Rule A: Saturation < 20% -> CONCRETE (Grey/Dark colors)
  if (s < 0.20) {
    return { material: MaterialType.CONCRETE, hp: 50 };
  } 
  // Rule B: Saturation >= 20% & Hue in blue/cyan spectrum [160, 260] -> GLASS
  if (h >= 160 && h <= 260) {
    return { material: MaterialType.GLASS, hp: 30 };
  } 
  // Rule C: Saturation >= 20% & Hue in brown spectrum (H [20, 50], low saturation) -> WOOD
  if (h >= 20 && h <= 50 && s < 0.65) {
    return { material: MaterialType.WOOD, hp: 40 };
  } 
  // Rule D: Saturation >= 20% & Hue in red/orange spectrum (approx H < 60 or H > 330) -> COPPER
  if (h < 60 || h > 330) {
    return { material: MaterialType.COPPER, hp: 50 };
  } 
  
  // Fallback based on brightness
  return { 
    material: l < 0.5 ? MaterialType.CONCRETE : MaterialType.COPPER, 
    hp: 50 
  };
}
