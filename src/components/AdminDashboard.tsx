import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Play, Download, Trash2, User, Hash, Clock, FileAudio, ChevronLeft, BarChart3, Mic2, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseStoredFilePath } from '../lib/storage';
import JSZip from 'jszip';

interface Recording {
  id: string;
  speaker_id: string;
  display_id: string;
  sequence_number: number;
  file_path: string;
  duration: number;
  created_at: string;
  user_name?: string; // Added user_name
}

interface SpeakerStats {
  id: string;
  count: number;
  totalDuration: number;
  lastRecorded: string;
  user_name?: string; 
}

const CustomAudioPlayer = ({ src, onClose }: { src: string; onClose: () => void }) => {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-6"
    >
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata} 
        onEnded={() => setIsPlaying(false)}
        autoPlay 
      />
      
      <button 
        onClick={togglePlay}
        className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-primary-light text-white rounded-xl shadow-lg shadow-primary-light/20 hover:scale-105 active:scale-95 transition-all"
      >
        {isPlaying ? <span className="text-xl">⏸</span> : <Play className="w-6 h-6 fill-current" />}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="relative group flex items-center h-6">
          <input 
            type="range" 
            min="0" 
            max={duration || 0} 
            value={currentTime} 
            onChange={handleScrub}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-primary-light 
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary-light 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white dark:[&::-webkit-slider-thumb]:border-slate-900
              [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-125"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={onClose}
          className="px-4 py-2 text-[10px] font-bold text-slate-400 hover:text-red-500 border border-slate-200 dark:border-slate-800 rounded-lg uppercase tracking-widest transition-colors"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
};

export const AdminDashboard = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeSignedUrl, setActiveSignedUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching recordings:', error);
      } else {
        setRecordings(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecording = async (id: string, path: string) => {
    setIsDeleting(id);
    const { data: deletedRows, error: dbError } = await supabase
      .from('recordings')
      .delete()
      .eq('id', id)
      .select('id');

    if (dbError) {
      const message = dbError.message || 'Unknown database error';
      if (message.toLowerCase().includes('row-level security') || message.toLowerCase().includes('permission')) {
        alert('Delete blocked by database permissions (RLS). Please update Supabase delete policy to allow admin deletes.');
      } else {
        alert(`Delete failed. DB: ${message}`);
      }
      setIsDeleting(null);
      return;
    }

    if (!deletedRows || deletedRows.length === 0) {
      alert('Delete not applied. This usually means your RLS policy does not allow deleting this row.');
      setIsDeleting(null);
      return;
    }

    // Remove row from UI immediately; storage cleanup is best-effort.
    setRecordings((prev) => prev.filter((recording) => recording.id !== id));

    const { bucket, objectPath } = parseStoredFilePath(path);
    const { error: storageError } = await supabase.storage.from(bucket).remove([objectPath]);

    if (storageError) {
      // Keep delete successful from user perspective if DB row is deleted.
      console.warn('Storage cleanup failed after DB delete:', storageError.message);
    }

    await fetchRecordings();
    setIsDeleting(null);
  };

  const getSignedAudioUrl = async (path: string) => {
    const { bucket, objectPath } = parseStoredFilePath(path);
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, 60 * 60);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || 'Could not generate signed URL');
    }

    return data.signedUrl;
  };

  const handlePlayClick = async (recording: Recording) => {
    if (playingId === recording.id) {
      setPlayingId(null);
      setActiveSignedUrl(null);
      return;
    }

    setPlayingId(recording.id);
    setActiveSignedUrl(null); // Reset while loading

    try {
      const signedUrl = await getSignedAudioUrl(recording.file_path);
      setActiveSignedUrl(signedUrl);
    } catch (err: any) {
      alert(`Could not play audio: ${err.message}`);
      setPlayingId(null);
    }
  };

  const triggerBrowserDownload = (blob: Blob, fileName: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const getSafeFileName = (recording: Recording, fallbackIndex?: number) => {
    const base = (recording.display_id || `recording_${fallbackIndex ?? 0}`)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${base}.wav`;
  };

  const downloadRecording = async (recording: Recording) => {
    try {
      const { bucket, objectPath } = parseStoredFilePath(recording.file_path);
      const { data, error } = await supabase.storage.from(bucket).download(objectPath);
      if (error || !data) {
        throw new Error(error?.message || 'Download failed');
      }
      const blob = data;
      triggerBrowserDownload(blob, getSafeFileName(recording));
    } catch (err: any) {
      alert(`Download failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const downloadAllRecordings = async (list: Recording[]) => {
    if (!list.length) {
      alert('No recordings available for download.');
      return;
    }

    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();

      for (let index = 0; index < list.length; index += 1) {
        const recording = list[index];
        const { bucket, objectPath } = parseStoredFilePath(recording.file_path);
        const { data, error } = await supabase.storage.from(bucket).download(objectPath);
        if (error || !data) continue;
        const fileBlob = data;
        zip.file(getSafeFileName(recording, index + 1), fileBlob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const scope = selectedSpeaker ? `speaker_${selectedSpeaker}` : 'all_speakers';
      triggerBrowserDownload(zipBlob, `recordings_${scope}.zip`);
    } catch (err: any) {
      alert(`Download all failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Aggregate stats by speaker
  const speakerStats = recordings.reduce((acc, rec) => {
    const sId = rec.speaker_id || 'Unknown';
    if (!acc[sId]) {
      acc[sId] = { id: sId, count: 0, totalDuration: 0, lastRecorded: rec.created_at, user_name: rec.user_name };
    }
    acc[sId].count += 1;
    acc[sId].totalDuration += rec.duration;
    if (new Date(rec.created_at) > new Date(acc[sId].lastRecorded)) {
      acc[sId].lastRecorded = rec.created_at;
      if (rec.user_name) acc[sId].user_name = rec.user_name;
    }
    return acc;
  }, {} as Record<string, SpeakerStats>);

  const sortedSpeakers = Object.values(speakerStats).sort((a, b) => b.count - a.count);
  const filteredRecordings = recordings.filter(r => r.speaker_id === selectedSpeaker);

  return (
    <div className="w-full max-w-6xl mx-auto animate-in fade-in duration-500">
      <AnimatePresence mode="wait">
        {!selectedSpeaker ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-archivo font-bold tracking-tight mb-2">Analytics</h2>
                <p className="text-slate-500 font-medium text-sm md:text-base">Dataset overview grouped by speaker patterns.</p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => downloadAllRecordings(recordings)}
                  disabled={isDownloadingAll || !recordings.length}
                  className="flex-1 md:flex-none px-4 py-3 bg-primary-light text-white rounded-2xl text-xs md:text-sm font-bold disabled:opacity-60 shadow-lg shadow-primary-light/20"
                >
                  {isDownloadingAll ? 'Preparing...' : 'Download All'}
                </button>
                <button onClick={fetchRecordings} className="px-5 py-3 bg-slate-100 dark:bg-slate-800 border border-[var(--border-color)] rounded-2xl text-xs md:text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Refresh</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                [...Array(3)].map((_, i) => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-3xl" />)
              ) : sortedSpeakers.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-400">No speakers found.</div>
              ) : (
                sortedSpeakers.map((speaker) => (
                  <button 
                    key={speaker.id} 
                    onClick={() => setSelectedSpeaker(speaker.id)}
                    className="bg-[var(--card-bg)] border border-[var(--border-color)] p-8 rounded-[2rem] text-left hover:border-primary-light transition-all group shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center group-hover:bg-primary-light transition-colors">
                        <User className="w-6 h-6 text-slate-500 group-hover:text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded-full border border-[var(--border-color)] uppercase tracking-widest">{speaker.count} Records</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-1 truncate pr-4">{speaker.user_name || speaker.id}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <Hash className="w-3 h-3 text-primary-light" />
                      <span className="text-xs font-bold text-slate-400 truncate">ID: {speaker.id}</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500 text-sm font-medium">
                       <div className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatTime(speaker.totalDuration)}</div>
                       <div className="flex items-center gap-1"><BarChart3 className="w-4 h-4" /> Last Active {new Date(speaker.lastRecorded).toLocaleDateString()}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="mb-8 md:mb-12">
               <button onClick={() => setSelectedSpeaker(null)} className="flex items-center gap-2 text-primary-light font-bold mb-6 hover:-translate-x-1 transition-transform uppercase tracking-widest text-[10px] md:text-xs">
                 <ChevronLeft className="w-4 h-4" /> Back to Speakers
               </button>
               <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-archivo font-bold tracking-tight mb-2">
                      {speakerStats[selectedSpeaker]?.user_name || selectedSpeaker}
                    </h2>
                    <p className="text-slate-500 font-medium tracking-tight text-sm md:text-base">Viewing all recordings for ID: <span className="text-primary-light font-mono font-bold">{selectedSpeaker}</span></p>
                  </div>
                 <button
                   onClick={() => downloadAllRecordings(filteredRecordings)}
                   disabled={isDownloadingAll || !filteredRecordings.length}
                   className="w-full md:w-auto px-6 py-3 bg-primary-light text-white rounded-2xl text-sm font-bold disabled:opacity-60 shadow-lg shadow-primary-light/20"
                 >
                   {isDownloadingAll ? 'Preparing ZIP...' : 'Download All Audio'}
                 </button>
               </div>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-sm">
              {/* Desktop Table View */}
              <table className="hidden md:table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-slate-50 dark:bg-slate-900/50">
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-400">Recording ID</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-400">User</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-400">Duration</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-400">Created At</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredRecordings.map((rec) => (
                    <React.Fragment key={rec.id}>
                    <tr className={`hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group ${playingId === rec.id ? 'bg-primary-light/5' : ''}`}>
                      <td className="px-8 py-5 font-bold text-primary-light flex items-center gap-3">
                        <Mic2 className="w-4 h-4 opacity-30" />
                        {rec.display_id || 'UNNAMED'}
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-300">
                        {rec.user_name || 'Anonymous'}
                      </td>
                      <td className="px-8 py-5 text-sm font-medium">{formatTime(rec.duration)}</td>
                      <td className="px-8 py-5 text-sm text-slate-500">{new Date(rec.created_at).toLocaleString()}</td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex justify-end gap-2">
                           <button 
                             onClick={() => handlePlayClick(rec)} 
                             className={`p-2 rounded-lg transition-colors ${playingId === rec.id ? 'bg-primary-light text-white' : 'text-slate-400 hover:text-primary-light hover:bg-primary-light/10'}`}
                           >
                             {playingId === rec.id && !activeSignedUrl ? (
                               <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                             ) : (
                               <Play className={`w-5 h-5 ${playingId === rec.id ? 'fill-current' : ''}`} />
                             )}
                           </button>
                           <button 
                             onClick={() => downloadRecording(rec)} 
                             className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                           >
                             <Download className="w-5 h-5" />
                           </button>
                           <button onClick={() => deleteRecording(rec.id, rec.file_path)} disabled={isDeleting === rec.id} className="p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"><Trash2 className="w-5 h-5" /></button>
                         </div>
                      </td>
                    </tr>
                    {playingId === rec.id && (
                      <tr className="bg-primary-light/[0.02] border-x-2 border-primary-light/20">
                        <td colSpan={5} className="px-8 py-6">
                          {activeSignedUrl ? (
                            <CustomAudioPlayer 
                              src={activeSignedUrl} 
                              onClose={() => {
                                setPlayingId(null);
                                setActiveSignedUrl(null);
                              }} 
                            />
                          ) : (
                            <div className="h-10 flex items-center justify-center gap-3 text-slate-400 text-sm font-bold animate-pulse">
                              <div className="w-4 h-4 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
                              PREPARING SECURE AUDIO...
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card List View */}
              <div className="md:hidden flex flex-col divide-y divide-[var(--border-color)]">
                {filteredRecordings.map((rec) => (
                  <div key={rec.id} className="p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-primary-light uppercase tracking-tighter">Recording ID</span>
                        <h4 className="text-xl font-bold">{rec.display_id || 'UNNAMED'}</h4>
                      </div>
                      <div className="flex gap-2">
                         <button 
                           onClick={() => handlePlayClick(rec)} 
                           className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${playingId === rec.id ? 'bg-primary-light text-white scale-110' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                         >
                           {playingId === rec.id && !activeSignedUrl ? (
                             <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                           ) : (
                             <Play className={`w-5 h-5 ${playingId === rec.id ? 'fill-current' : ''}`} />
                           )}
                         </button>
                         <button onClick={() => downloadRecording(rec)} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl"><Download className="w-5 h-5" /></button>
                         <button onClick={() => deleteRecording(rec.id, rec.file_path)} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(rec.duration)}</div>
                      <div className="flex items-center gap-1"><User className="w-3 h-3" /> {rec.user_name || 'Anonymous'}</div>
                    </div>

                    {playingId === rec.id && (
                      <div className="mt-2 animate-in slide-in-from-top-2">
                        {activeSignedUrl ? (
                          <CustomAudioPlayer 
                            src={activeSignedUrl} 
                            onClose={() => {
                              setPlayingId(null);
                              setActiveSignedUrl(null);
                            }} 
                          />
                        ) : (
                          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-400 animate-pulse">
                            <div className="w-3 h-3 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
                            LOADING...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
