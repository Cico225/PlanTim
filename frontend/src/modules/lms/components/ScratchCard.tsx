import { useState, useRef, useEffect } from 'react';
import { FiGift } from 'react-icons/fi';

interface ScratchCardProps {
  reward: {
    title: string;
    description?: string;
    message?: string;
    reward_type: string;
    points_value?: number;
  };
  onComplete: () => void;
}

export default function ScratchCard({ reward, onComplete }: ScratchCardProps) {
  const [scratched, setScratched] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isScratching = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawScratchLayer = () => {
      // Set canvas size based on container
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Draw scratch layer
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(0, 0, rect.width, rect.height);
      
      // Draw pattern - responsive pattern size
      const patternSize = window.innerWidth < 768 ? 15 : 20;
      ctx.fillStyle = '#FFA500';
      for (let i = 0; i < rect.width; i += patternSize) {
        for (let j = 0; j < rect.height; j += patternSize) {
          if ((i + j) % (patternSize * 2) === 0) {
            ctx.fillRect(i, j, patternSize / 2, patternSize / 2);
          }
        }
      }

      // Draw text - responsive font size
      ctx.fillStyle = '#000';
      const fontSize = window.innerWidth < 640 ? 18 : window.innerWidth < 768 ? 20 : 24;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Zagrebi!', rect.width / 2, rect.height / 2);
    };

    drawScratchLayer();

    // Redraw on window resize
    const handleResize = () => {
      drawScratchLayer();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isScratching.current = true;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isScratching.current) {
      scratch(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    isScratching.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isScratching.current = true;
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (isScratching.current) {
      const touch = e.touches[0];
      scratch(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isScratching.current = false;
  };

  const scratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Convert client coordinates to canvas coordinates
    // Since we scaled the context, we use logical coordinates
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Use composite operation to "erase" the scratch layer
    // Larger radius for touch devices
    const radius = window.innerWidth < 768 ? 40 : 30;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Calculate scratched area - sample for performance
    const sampleWidth = Math.floor(rect.width);
    const sampleHeight = Math.floor(rect.height);
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const pixels = imageData.data;
    let transparentPixels = 0;
    
    // Sample every 4th pixel for performance
    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] === 0) {
        transparentPixels++;
      }
    }

    const totalPixels = (sampleWidth * sampleHeight) / 4; // Account for sampling
    const progress = (transparentPixels / totalPixels) * 100;
    setScratchProgress(Math.min(progress, 100));

    // If 30% scratched, reveal the reward
    if (progress >= 30 && !scratched) {
      setScratched(true);
      // Don't auto-close, let user see the reward
    }
  };

  return (
    <div className="relative w-full">
      <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-4 sm:p-6 md:p-8 text-center text-white shadow-lg min-h-[200px] sm:min-h-[250px] md:min-h-[300px] flex flex-col justify-center">
        <FiGift className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4" />
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">{reward.title}</h3>
        {reward.description && (
          <p className="text-sm sm:text-base md:text-lg opacity-90">{reward.description}</p>
        )}
        {reward.reward_type === 'bonus_points' && reward.points_value && (
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold mt-2 sm:mt-4">+{reward.points_value} bodova</p>
        )}
        {reward.message && (
          <p className="mt-2 sm:mt-4 text-xs sm:text-sm opacity-80 px-2">{reward.message}</p>
        )}
      </div>

      {!scratched && (
        <div className="absolute inset-0">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair rounded-lg touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'none' }}
          />
        </div>
      )}

      {!scratched && scratchProgress > 0 && (
        <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 sm:px-4 py-1 sm:py-2 rounded text-xs sm:text-sm">
          Zagrebano: {Math.round(scratchProgress)}%
        </div>
      )}

      {scratched && (
        <button
          onClick={onComplete}
          className="mt-4 btn-secondary bg-white text-purple-600 hover:bg-gray-100 w-full text-sm sm:text-base py-2 sm:py-3"
        >
          Zatvori
        </button>
      )}
    </div>
  );
}


