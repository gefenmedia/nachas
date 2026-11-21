import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Google Fonts (SIL OFL), bundled in public/fonts so renders work offline — no paid fonts.
export const sans = 'Montserrat';
export const serif = 'Frank Ruhl Libre';
loadFont({family: sans, url: staticFile('fonts/Montserrat-latin-var.woff2'), weight: '100 900', format: 'woff2'});
loadFont({family: serif, url: staticFile('fonts/FrankRuhlLibre-latin-var.woff2'), weight: '300 900', format: 'woff2'});

// Bulletproof Bitachon brand palette. Keep consistent across episodes.
export const colors = {
  navy: '#0E1A2B',
  navyDeep: '#070F1B',
  navyLift: '#16263D',
  cream: '#F6EEDF',
  creamDim: '#CFC6B6',
  gold: '#F2B24C',
  goldSoft: '#E6C27A',
  amber: '#D9892B',
  charcoal: '#2A2F38',
  slate: '#5B6676',
  ice: '#BFD6E6',
};

export type Layout = {
  width: number;
  height: number;
  // visual stage (square SVG) centre + size in px
  stageX: number;
  stageY: number;
  stageSize: number;
  // caption block vertical centre in px
  captionY: number;
  captionFontSize: number;
  captionMaxWidth: number;
  hookY: number;
  hookFontSize: number;
  tagY: number;
};

export const verticalLayout: Layout = {
  width: 1080,
  height: 1920,
  stageX: 540,
  stageY: 700,
  stageSize: 900,
  captionY: 1150, // ~60% down: inside the 48–66% band, clear of bottom UI + right rail
  captionFontSize: 92,
  captionMaxWidth: 860, // ≥10% side margins
  hookY: 270,
  hookFontSize: 74,
  tagY: 232,
};

export const horizontalLayout: Layout = {
  width: 1920,
  height: 1080,
  stageX: 960,
  stageY: 430,
  stageSize: 640,
  captionY: 830,
  captionFontSize: 84,
  captionMaxWidth: 1500,
  hookY: 150,
  hookFontSize: 70,
  tagY: 96,
};
