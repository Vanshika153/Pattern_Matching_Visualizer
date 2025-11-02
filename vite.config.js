import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ base: '/Pattern_Matching_Visualizer/',  plugins:[react()], server:{ port:5173, open:true } });