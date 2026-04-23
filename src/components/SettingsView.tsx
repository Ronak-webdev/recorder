import { useState, useEffect } from 'react';
import { Shield, Database, Wifi, Info, User, Settings as SettingsIcon, Mic, Trash2, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onNameChange: (name: string) => void;
  currentName: string;
}

export const SettingsView = ({ onNameChange, currentName }: Props) => {
  const [name, setName] = useState(currentName);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'Not Configured';

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      setDevices(devices.filter(d => d.kind === 'audioinput'));
    });
  }, []);

  const handleUpdateName = () => {
    if (name.trim()) {
      onNameChange(name);
      localStorage.setItem('recorder_user_name', name);
      alert('Profile updated!');
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the app? This will clear your name and local settings.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-archivo font-bold tracking-tight mb-2">Preferences</h2>
          <p className="text-slate-500 font-medium text-sm md:text-base">Manage your profile and recording environment.</p>
        </div>
        <button 
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 text-sm font-bold rounded-xl transition-colors border border-transparent hover:border-red-100"
        >
          <RotateCcw className="w-4 h-4" /> Reset App
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 bg-primary-light/10 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-primary-light" />
              </div>
              <h3 className="text-xl font-bold">Your Profile</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-widest">Full Name</label>
                <div className="flex flex-col md:flex-row gap-4">
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-[var(--border-color)] rounded-xl px-4 py-3 outline-none focus:border-primary-light font-medium"
                  />
                  <button 
                    onClick={handleUpdateName}
                    className="px-6 py-3 bg-primary-light text-white rounded-xl font-bold shadow-sm hover:scale-[1.02] transition-transform"
                  >
                    Save
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">This name is used to label your recordings in the admin dashboard.</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                <Mic className="w-5 h-5 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold">Audio Settings</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-widest">Input Device</label>
                <select 
                  value={selectedDevice} 
                  onChange={e => setSelectedDevice(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-[var(--border-color)] rounded-xl px-4 py-3 outline-none focus:border-primary-light font-medium appearance-none"
                >
                  {devices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                  {devices.length === 0 && <option>No microphones detected</option>}
                </select>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-indigo-50/30 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">High Quality Mode</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Always On</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Column */}
        <div className="space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <Wifi className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-bold">Connection</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-500/5 rounded-2xl border border-green-100 dark:border-green-500/10 text-center">
                <span className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-widest">Live Sync Enabled</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 break-all leading-relaxed">
                {supabaseUrl}
              </div>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <Shield className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-bold">Privacy</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Your audio files are stored in a private bucket. Only authorized administrators can listen to or download them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
