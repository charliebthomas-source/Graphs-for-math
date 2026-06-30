// Arena coordinate system: 10px = 1m
// Small arena 20x40m → 200x400 SVG units
// C at top (y=0), A at bottom (y=400)

window.ARENA_CONFIG = {
  small: {
    label: '20m × 40m',
    svgWidth: 200,
    svgHeight: 400,
    viewBox: '-40 -30 280 460',
    letters: {
      C: { x: 100, y: 0,   side: 'top',    label: 'C' },
      H: { x: 0,   y: 60,  side: 'left',   label: 'H' },
      E: { x: 0,   y: 200, side: 'left',   label: 'E' },
      K: { x: 0,   y: 340, side: 'left',   label: 'K' },
      A: { x: 100, y: 400, side: 'bottom', label: 'A' },
      F: { x: 200, y: 340, side: 'right',  label: 'F' },
      B: { x: 200, y: 200, side: 'right',  label: 'B' },
      M: { x: 200, y: 60,  side: 'right',  label: 'M' },
      G: { x: 100, y: 60,  side: 'center', label: 'G' },
      X: { x: 100, y: 200, side: 'center', label: 'X' },
      D: { x: 100, y: 340, side: 'center', label: 'D' },
    }
  },
  large: {
    label: '20m × 60m',
    svgWidth: 200,
    svgHeight: 600,
    viewBox: '-40 -30 280 660',
    letters: {
      C: { x: 100, y: 0,   side: 'top',    label: 'C' },
      H: { x: 0,   y: 60,  side: 'left',   label: 'H' },
      S: { x: 0,   y: 180, side: 'left',   label: 'S' },
      E: { x: 0,   y: 300, side: 'left',   label: 'E' },
      V: { x: 0,   y: 420, side: 'left',   label: 'V' },
      K: { x: 0,   y: 540, side: 'left',   label: 'K' },
      A: { x: 100, y: 600, side: 'bottom', label: 'A' },
      F: { x: 200, y: 540, side: 'right',  label: 'F' },
      P: { x: 200, y: 420, side: 'right',  label: 'P' },
      B: { x: 200, y: 300, side: 'right',  label: 'B' },
      R: { x: 200, y: 180, side: 'right',  label: 'R' },
      M: { x: 200, y: 60,  side: 'right',  label: 'M' },
      G: { x: 100, y: 60,  side: 'center', label: 'G' },
      L: { x: 100, y: 180, side: 'center', label: 'L' },
      X: { x: 100, y: 300, side: 'center', label: 'X' },
      I: { x: 100, y: 420, side: 'center', label: 'I' },
      D: { x: 100, y: 540, side: 'center', label: 'D' },
    }
  }
};
