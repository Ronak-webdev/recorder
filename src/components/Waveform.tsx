import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface Props {
  url: string | null;
  isRecording?: boolean;
  analyser?: AnalyserNode | null;
}

export const Waveform = ({ url, isRecording, analyser }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  // Static Waveform with WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !url || isRecording) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#6366f1', // Primary Indigo
      progressColor: '#a855f7', // Purple
      cursorColor: '#f43f5e', // Rose
      barWidth: 3,
      barGap: 4,
      barRadius: 4,
      height: 100,
    });

    wavesurfer.load(url);
    waveSurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
    };
  }, [url, isRecording]);

  // Live Waveform with Canvas
  useEffect(() => {
    if (!isRecording || !analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = 4;
      const gap = 2;
      const barCount = Math.floor(canvas.width / (barWidth + gap) / 2);
      const centerY = canvas.height / 2;

      // Draw bars from center outwards
      for (let i = 0; i < barCount; i++) {
        // Use lower frequencies more prominently
        const freqIndex = Math.floor((i / barCount) * (bufferLength / 2));
        const val = dataArray[freqIndex];
        const barHeight = (val / 255) * (canvas.height * 0.8) + 2;

        const xRight = (canvas.width / 2) + (i * (barWidth + gap));
        const xLeft = (canvas.width / 2) - (i * (barWidth + gap)) - barWidth;

        // Gradient color
        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#a855f7');
        ctx.fillStyle = gradient;

        // Rounded rectangles for pillars
        const drawPillar = (x: number) => {
          const radius = barWidth / 2;
          const y = centerY - barHeight / 2;
          
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, radius);
          ctx.fill();
        };

        drawPillar(xRight);
        drawPillar(xLeft);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isRecording, analyser]);

  const togglePlay = () => {
    waveSurferRef.current?.playPause();
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="relative w-full h-40 bg-slate-50 dark:bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        {!isRecording ? (
          <div ref={containerRef} className="w-full h-full p-4" />
        ) : (
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={160} 
            className="w-full h-full px-4"
          />
        )}
      </div>
      
      {!isRecording && url && (
        <div className="flex justify-center">
          <button 
            onClick={togglePlay}
            className="px-6 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-primary-light hover:text-white transition-all"
          >
            Play / Pause
          </button>
        </div>
      )}
    </div>
  );
};
