import { useState, useRef, useEffect } from 'react';
import { FiRotateCw } from 'react-icons/fi';

interface SpinWheelProps {
  rewards: Array<{
    id: number;
    title: string;
    reward_type: string;
    points_value?: number;
    probability: number;
  }>;
  onSpinComplete: (reward: any) => void;
  segments?: number; // Optional: number of segments to display (defaults to rewards.length)
}

export default function SpinWheel({ rewards, onSpinComplete, segments = 8 }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [hasSpun, setHasSpun] = useState(false); // Track if wheel has been spun
  const [showGiftAnimation, setShowGiftAnimation] = useState(false); // Show gift opening animation
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  // Distribute rewards across segments
  const getDistributedRewards = () => {
    if (rewards.length === 0) return [];
    
    const numSegments = Math.max(segments, rewards.length);
    const distributed: Array<{ reward: any; probability: number }> = [];
    
    // Calculate total probability
    const totalProbability = rewards.reduce((sum, r) => sum + r.probability, 0);
    
    // Distribute rewards across segments
    rewards.forEach((reward) => {
      const segmentCount = Math.round((reward.probability / totalProbability) * numSegments);
      for (let i = 0; i < segmentCount; i++) {
        distributed.push({
          reward,
          probability: reward.probability / segmentCount,
        });
      }
    });
    
    // Fill remaining segments with equal distribution
    while (distributed.length < numSegments) {
      const remaining = numSegments - distributed.length;
      const perReward = remaining / rewards.length;
      rewards.forEach((reward) => {
        for (let i = 0; i < Math.floor(perReward); i++) {
          distributed.push({
            reward,
            probability: reward.probability / (distributed.filter(d => d.reward.id === reward.id).length + 1),
          });
        }
      });
    }
    
    // Trim to exact number of segments
    return distributed.slice(0, numSegments);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawWheelOnCanvas = () => {
      // Set canvas size - responsive for mobile
      // Use container width or viewport width, whichever is smaller
      const container = canvas.parentElement;
      const containerWidth = container ? container.clientWidth : window.innerWidth;
      const maxSize = window.innerWidth < 640 ? 280 : window.innerWidth < 768 ? 320 : 400;
      const size = Math.min(maxSize, Math.min(containerWidth - 20, window.innerWidth - 40));
      canvas.width = size;
      canvas.height = size;
      
      // Set CSS size to match logical size for proper display
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;

      drawWheel(ctx, size);
    };

    drawWheelOnCanvas();

    // Redraw on window resize
    const handleResize = () => {
      drawWheelOnCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [rewards, segments]);

  const drawWheel = (ctx: CanvasRenderingContext2D, size: number) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;

    const distributed = getDistributedRewards();
    const numSegments = distributed.length;
    const anglePerSegment = (Math.PI * 2) / numSegments;
    
    // Draw segments
    let currentAngle = -Math.PI / 2; // Start from top
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
      '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
      '#1ABC9C', '#E67E22', '#34495E', '#16A085', '#27AE60'
    ];

    distributed.forEach((item, index) => {
      const angle = anglePerSegment;
      
      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw gift box icon instead of text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(currentAngle + angle / 2);
      
      // Draw gift box (simple rectangle with bow)
      const iconSize = size < 300 ? 24 : size < 350 ? 28 : 32;
      const iconX = radius * 0.6;
      const iconY = 0;
      
      // Gift box body with gradient effect
      const gradient = ctx.createLinearGradient(
        iconX - iconSize / 2, iconY - iconSize / 2,
        iconX + iconSize / 2, iconY + iconSize / 2
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#f0f0f0');
      ctx.fillStyle = gradient;
      ctx.fillRect(iconX - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize);
      
      // Box border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(iconX - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize);
      
      // Box lid (top part)
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(iconX - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize / 3);
      
      // Bow on top (left circle)
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(iconX - iconSize / 4, iconY - iconSize / 2, iconSize / 5, 0, Math.PI * 2);
      ctx.fill();
      
      // Bow on top (right circle)
      ctx.beginPath();
      ctx.arc(iconX + iconSize / 4, iconY - iconSize / 2, iconSize / 5, 0, Math.PI * 2);
      ctx.fill();
      
      // Bow center
      ctx.fillStyle = '#FFA500';
      ctx.beginPath();
      ctx.arc(iconX, iconY - iconSize / 2, iconSize / 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Ribbon (vertical)
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(iconX - iconSize / 20, iconY - iconSize / 2, iconSize / 10, iconSize);
      
      // Ribbon (horizontal)
      ctx.fillRect(iconX - iconSize / 2, iconY - iconSize / 20, iconSize, iconSize / 10);
      
      // Question mark in center (to indicate mystery)
      ctx.fillStyle = '#333';
      ctx.font = `bold ${iconSize / 2}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', iconX, iconY + iconSize / 8);
      
      ctx.restore();

      currentAngle += angle;
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  const spin = () => {
    if (spinning || rewards.length === 0 || hasSpun) return;

    setSpinning(true);
    setSelectedReward(null);

    // Select random reward based on probability
    const totalProbability = rewards.reduce((sum, r) => sum + r.probability, 0);
    const random = Math.random() * totalProbability;
    let cumulative = 0;
    let selectedReward = null;

    for (let i = 0; i < rewards.length; i++) {
      cumulative += rewards[i].probability;
      if (random <= cumulative) {
        selectedReward = rewards[i];
        break;
      }
    }

    if (!selectedReward) {
      selectedReward = rewards[0];
    }

    const selected = selectedReward;
    const distributed = getDistributedRewards();
    
    // Find which segment contains this reward (randomly select one if multiple)
    const matchingSegments = distributed
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.reward.id === selected.id);
    
    const selectedSegmentIndex = matchingSegments.length > 0
      ? matchingSegments[Math.floor(Math.random() * matchingSegments.length)].index
      : 0;

    // Calculate rotation
    const numSegments = distributed.length;
    const anglePerSegment = (Math.PI * 2) / numSegments;
    const targetAngle = -Math.PI / 2 + (selectedSegmentIndex * anglePerSegment) + (anglePerSegment / 2);

    // Convert to degrees and add multiple spins
    const targetRotation = (targetAngle * 180 / Math.PI) + 360 * 5; // 5 full spins
    const startRotation = rotationRef.current % 360;
    const rotation = targetRotation - startRotation;

    // Animate
    const duration = 3000; // 3 seconds
    const startTime = Date.now();
    const startRotationValue = rotationRef.current;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      rotationRef.current = startRotationValue + rotation * easeOut;
      
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.transform = `rotate(${rotationRef.current}deg)`;
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setSelectedReward(selected);
        setHasSpun(true); // Mark as spun
        // Show gift opening animation after a short delay
        setTimeout(() => {
          setShowGiftAnimation(true);
        }, 500);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4 sm:space-y-6 w-full px-2 sm:px-0 overflow-x-auto">
      <div className="relative flex justify-center items-center" style={{ minWidth: '280px', minHeight: '280px' }}>
        {/* Fixed pointer - positioned absolutely above the wheel */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 sm:-translate-y-2 z-10">
          <div className="w-0 h-0 border-l-[12px] sm:border-l-[15px] border-l-transparent border-r-[12px] sm:border-r-[15px] border-r-transparent border-t-[20px] sm:border-t-[25px] border-t-red-600 drop-shadow-lg"></div>
        </div>
        <canvas
          ref={canvasRef}
          className="transition-transform duration-100"
          style={{ 
            transform: `rotate(${rotationRef.current}deg)`,
            maxWidth: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
      </div>

      <button
        onClick={spin}
        disabled={spinning || hasSpun}
        className={`btn-primary flex items-center justify-center gap-2 text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 w-full sm:w-auto ${
          (spinning || hasSpun) ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <FiRotateCw className={`w-4 h-4 sm:w-5 sm:h-5 ${spinning ? 'animate-spin' : ''}`} />
        <span className="whitespace-nowrap">
          {spinning ? 'Vrti se...' : hasSpun ? 'Već ste zavrtjeli točak' : 'Zavrti točak!'}
        </span>
      </button>

      {/* Gift Opening Animation Modal */}
      {showGiftAnimation && selectedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 animate-fade-in">
          <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 sm:p-8 md:p-12 text-center text-white shadow-2xl max-w-md w-full transform transition-all duration-1000 scale-100">
            {/* Gift box animation */}
            <div className="relative mb-6 flex justify-center items-center h-32 sm:h-40 md:h-48">
              {/* Gift box lid (opens upward) */}
              <div className={`absolute top-0 transition-all duration-1000 ease-out ${showGiftAnimation ? 'transform -translate-y-full -rotate-12 opacity-0' : 'opacity-100'}`}>
                <div className="w-20 h-6 sm:w-28 sm:h-8 md:w-36 md:h-10 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-lg shadow-lg">
                  <div className="flex justify-center items-center h-full">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-yellow-300 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              {/* Gift box body (scales up) */}
              <div className={`w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 bg-gradient-to-b from-white to-gray-200 rounded-lg shadow-2xl transition-all duration-1000 ease-out ${showGiftAnimation ? 'scale-150' : 'scale-100'}`}>
                <div className="flex flex-col items-center justify-center h-full p-2 sm:p-4">
                  <div className="text-3xl sm:text-4xl md:text-5xl mb-1 sm:mb-2">🎁</div>
                  <div className="text-xs sm:text-sm font-bold text-gray-800">?</div>
                </div>
              </div>
              
              {/* Ribbon */}
              <div className="absolute w-full h-2 sm:h-3 bg-red-500 rounded"></div>
            </div>
            
            {/* Reward content (fades in after box opens) */}
            <div className={`transition-all duration-1000 delay-700 ${showGiftAnimation ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-0'}`}>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                {selectedReward.title}
              </h3>
              {selectedReward.description && (
                <p className="text-base sm:text-lg md:text-xl opacity-90 mb-4">
                  {selectedReward.description}
                </p>
              )}
              {selectedReward.reward_type === 'bonus_points' && selectedReward.points_value && (
                <p className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 animate-bounce">
                  +{selectedReward.points_value} bodova
                </p>
              )}
              {selectedReward.message && (
                <p className="text-sm sm:text-base opacity-80 mb-6">
                  {selectedReward.message}
                </p>
              )}
              <button
                onClick={() => {
                  setShowGiftAnimation(false);
                  onSpinComplete(selectedReward);
                }}
                className="btn-secondary bg-white text-purple-600 hover:bg-gray-100 w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 font-semibold"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regular reward display (when animation is not shown) */}
      {selectedReward && !showGiftAnimation && (
        <div className="mt-2 sm:mt-4 p-3 sm:p-4 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg text-center w-full">
          <p className="text-base sm:text-lg font-semibold text-green-800 dark:text-green-200">
            Osvojili ste: {selectedReward.title}
          </p>
          {selectedReward.reward_type === 'bonus_points' && selectedReward.points_value && (
            <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
              +{selectedReward.points_value} bodova
            </p>
          )}
          <button
            onClick={() => onSpinComplete(selectedReward)}
            className="mt-3 sm:mt-4 btn-secondary bg-white text-green-600 hover:bg-gray-100 w-full sm:w-auto text-sm sm:text-base py-2 sm:py-3"
          >
            Zatvori
          </button>
        </div>
      )}
    </div>
  );
}

