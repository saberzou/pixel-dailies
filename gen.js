const fs = require('fs');
const SIZE = 20;

function mirrorHalf(half){
  return half.map(row => row.concat([...row].reverse()));
}

function makeGrid(fn){
  const half = Array.from({length: SIZE}, (_, y)=>
    Array.from({length: SIZE/2}, (_, x)=> fn(x,y) ? 1 : 0)
  );
  return mirrorHalf(half);
}

function applyAccent(grid, accentRatio=0.1){
  // grid values 0/1 => convert some 1s to 2s at ~10%
  const coords = [];
  for (let y=0;y<SIZE;y++) for (let x=0;x<SIZE;x++) if (grid[y][x]===1) coords.push([x,y]);
  const target = Math.max(1, Math.round(coords.length*accentRatio));
  // deterministic pick: use simple hash
  coords.sort((a,b)=> (a[0]*31+a[1]*17) - (b[0]*31+b[1]*17));
  for (let i=0;i<target;i++){
    const [x,y]=coords[i];
    grid[y][x]=2;
  }
  return grid;
}

function toStr(grid){
  return grid.map(row=>row.map(v=>v.toString(16)).join('')).join('');
}

const patterns = [
  {
    title: 'Electric Diamond',
    bg: '#000000',
    c1: '#3B82F6',
    c2: '#0EA5E9',
    fn: (x,y)=>{
      const cx=SIZE/2-0.5, cy=SIZE/2-0.5;
      const d = Math.abs(x-cx)+Math.abs(y-cy);
      return Math.floor(d)%3===0;
    }
  },
  {
    title: 'Soft Ripple',
    bg: '#FFFFFF',
    c1: '#FF6B6B',
    c2: '#F87171',
    fn: (x,y)=>{
      const cx=SIZE/2-0.5, cy=SIZE/2-0.5;
      const d = Math.sqrt((x-cx)**2+(y-cy)**2);
      return Math.floor(d)%2===0;
    }
  },
  {
    title: 'Woven Grid',
    bg: '#000000',
    c1: '#A3E635',
    c2: '#84CC16',
    fn: (x,y)=> ((x+y)%3===0) || ((x*2+y)%7===0)
  },
  {
    title: 'Orbit Lines',
    bg: '#FFFFFF',
    c1: '#8B5CF6',
    c2: '#A78BFA',
    fn: (x,y)=> ((x*2+y)%5===0)
  },
  {
    title: 'Citrus Rings',
    bg: '#FFFFFF',
    c1: '#F59E0B',
    c2: '#FBBF24',
    fn: (x,y)=>{
      const cx=SIZE/2-0.5, cy=SIZE/2-0.5;
      const d = Math.hypot(x-cx,y-cy);
      return Math.floor(d)%3===0;
    }
  },
  {
    title: 'Neon Lattice',
    bg: '#000000',
    c1: '#22D3EE',
    c2: '#06B6D4',
    fn: (x,y)=> (x%3===0)||(y%4===0)
  },
  {
    title: 'Pulse Cross',
    bg: '#FFFFFF',
    c1: '#F472B6',
    c2: '#FB7185',
    fn: (x,y)=> (x===Math.floor(SIZE/2)) || (y===Math.floor(SIZE/2)) || ((x+y)%6===0)
  },
  {
    title: 'Quartz Steps',
    bg: '#FFFFFF',
    c1: '#60A5FA',
    c2: '#93C5FD',
    fn: (x,y)=> ((x+y)%4===0) || ((x*3+y)%8===0)
  },
  {
    title: 'Emerald Maze',
    bg: '#000000',
    c1: '#34D399',
    c2: '#10B981',
    fn: (x,y)=> ((x*3+y*5)%9===0) || ((x-y+40)%7===0)
  },
  {
    title: 'Crimson Bloom',
    bg: '#FFFFFF',
    c1: '#EF4444',
    c2: '#F87171',
    fn: (x,y)=>{
      const cx=SIZE/2-0.5, cy=SIZE/2-0.5;
      const d = Math.abs(x-cx)+Math.abs(y-cy);
      return d%4===0;
    }
  }
];

const gallery = patterns.map((p,i)=>{
  const base = makeGrid(p.fn);
  const withAccent = applyAccent(base, 0.1);
  return {
    date: `2026-02-${18-i}`,
    title: p.title,
    size: SIZE,
    fps: 1,
    palette: [p.bg, p.c1, p.c2],
    frames: [toStr(withAccent)]
  };
});

const out = `// Pixel art gallery data\n// 20×20 grid, symmetrical abstract patterns, 2 colors + background\n\nconst gallery = ${JSON.stringify(gallery, null, 2)};\n`;
fs.writeFileSync('/Users/saberzou/.openclaw/workspace/pixel-gallery/data.js', out);
console.log('written', gallery.length);
