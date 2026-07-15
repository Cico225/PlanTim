import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import stripWebkitTextSizeAdjust from './postcss.strip-webkit-text-size-adjust.js';

export default {
  plugins: [
    tailwindcss,
    autoprefixer,
    stripWebkitTextSizeAdjust,
  ],
};

