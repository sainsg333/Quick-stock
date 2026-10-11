/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{ts,tsx}'],
  theme: { extend: {
    fontFamily: { sans: ['Inter','ui-sans-serif','system-ui','sans-serif'] },
    colors: { ink:'#0b1419', panel:'#111c22', line:'#26343a', mint:'#b4f272', muted:'#8e9da2' },
    boxShadow: { panel:'0 16px 60px #060d1055' }
  } }, plugins:[]
};
