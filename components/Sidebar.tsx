
import React, { useState, useEffect, useRef } from 'react';
import { Route, ChatMessage, BusLocation } from '../types';
import { AVAILABLE_ROUTES } from '../constants';
import { geminiService } from '../services/geminiService';
import { Bus, MessageSquare, Send, Settings, ChevronUp, ChevronDown, Map, Sparkles, Sun, Moon, Activity, Globe } from 'lucide-react';
import { transitService } from '../services/transitService';

interface SidebarProps {
  selectedRoute: string | null;
  onSelectRoute: (routeNo: string | null) => void;
  activeBuses: BusLocation[];
  onSetApiKey: (key: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ selectedRoute, onSelectRoute, activeBuses, onSetApiKey, theme, toggleTheme }) => {
  const [tab, setTab] = useState<'routes' | 'chat' | 'settings'>('routes');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I am your VanCity Transit assistant. Ask me about routes, delays, or how to get around Vancouver.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [apiKeyInput, setApiKeyInput] = useState('pvVIMtNgpcDbD9EICmbX');
  const [proxyInput, setProxyInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Mobile State
  const [isExpanded, setIsExpanded] = useState(false); 

  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded, tab]);

  useEffect(() => {
    setIsSimulating(transitService.isSimulationMode());
  }, [tab]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));
    history.push({ role: 'user', parts: [{ text: userMsg.text }] });

    const responseText = await geminiService.sendMessage(history, userMsg.text, activeBuses);

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  const handleSaveKey = () => {
    transitService.setApiKey(apiKeyInput);
    transitService.setCustomProxy(proxyInput);
    transitService.toggleSimulation(false); 
    setIsSimulating(false);
    onSetApiKey(apiKeyInput);
    alert("Settings saved. Fetching real-time data...");
  };

  const toggleSimulation = (enabled: boolean) => {
    transitService.toggleSimulation(enabled);
    setIsSimulating(enabled);
    onSetApiKey(apiKeyInput);
  };

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div 
      className={`
        pointer-events-auto
        transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        
        /* Mobile: Bottom Sheet */
        fixed bottom-0 left-0 right-0 
        bg-white/90 dark:bg-[#020617]/85 backdrop-blur-2xl
        rounded-t-[2rem] shadow-[0_-8px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-8px_40px_rgba(0,0,0,0.8)]
        border-t border-slate-200 dark:border-white/10
        flex flex-col
        z-[2000]
        ${isExpanded ? 'h-[85dvh]' : 'h-[180px]'}
        
        /* Desktop: Floating Panel */
        md:absolute md:top-6 md:left-6 md:bottom-6 md:w-[400px] md:h-auto
        md:rounded-[2.5rem] md:border md:border-slate-200 dark:md:border-white/5 
        md:shadow-2xl md:bg-white/80 dark:md:bg-[#020617]/80
      `}
    >
      {/* Mobile Drag Handle Area */}
      <div 
        onClick={toggleExpand}
        className="md:hidden w-full flex items-center justify-center pt-4 pb-2 cursor-pointer active:opacity-70"
      >
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600/50 rounded-full mb-1"></div>
      </div>

      {/* Header */}
      <div className="px-6 pt-2 pb-6 flex items-center justify-between shrink-0">
        <div className="flex flex-col cursor-pointer group" onClick={() => setIsExpanded(true)}>
          <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 dark:from-cyan-400 dark:via-blue-500 dark:to-purple-500 bg-clip-text text-transparent tracking-tight drop-shadow-sm">
            VanCity<span className="font-light text-slate-700 dark:text-white/80">Transit</span>
          </h1>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mt-1">
             <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_10px] ${isSimulating ? 'bg-amber-500 shadow-amber-500/80' : 'bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-emerald-400/80'}`}></span>
             <span className={isSimulating ? 'text-amber-600 dark:text-amber-500/90' : 'text-emerald-600 dark:text-emerald-400/90'}>
               {isSimulating ? 'Simulation' : 'Live Network'}
             </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-amber-500/10 dark:hover:bg-white/10 transition-all border border-transparent"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Desktop Settings Button */}
          <button 
              onClick={() => setTab('settings')}
              className="hidden md:block p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-transparent"
            >
              <Settings size={18} />
          </button>

          {/* Mobile Collapse/Expand Button */}
          <button 
            onClick={toggleExpand}
            className="md:hidden p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mx-6 mb-4 bg-slate-100 dark:bg-black/20 p-1.5 rounded-[1.5rem] flex shrink-0 border border-slate-200 dark:border-white/5 relative">
        {(['routes', 'chat', 'settings'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setIsExpanded(true); }}
            className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider rounded-[1.1rem] transition-all duration-300 flex items-center justify-center gap-2 relative z-10
              ${tab === t 
                ? 'bg-white dark:bg-gradient-to-b dark:from-slate-800 dark:to-slate-900 text-cyan-950 dark:text-cyan-100 shadow-sm dark:shadow-lg ring-1 ring-black/5 dark:ring-white/10' 
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}
          >
            {t === 'routes' && <Map size={14} />}
            {t === 'chat' && <MessageSquare size={14} />}
            {t === 'settings' && <Settings size={14} />}
            <span className="hidden sm:inline">{t}</span>
          </button>
        ))}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 custom-scrollbar mask-image-b">
        
        {/* Routes Tab */}
        {tab === 'routes' && (
          <div className="space-y-3 pt-1">
            <button
              onClick={() => onSelectRoute(null)}
              className={`w-full p-4 rounded-[1.8rem] text-left transition-all duration-300 border group ${
                selectedRoute === null 
                  ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-200 dark:border-blue-500/30 shadow-lg shadow-blue-500/10 dark:shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                  : 'bg-slate-50 dark:bg-white/5 border-transparent hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl transition-colors ${selectedRoute === null ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>
                  <Globe size={20} />
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-0.5">Network Overview</div>
                  <div className="text-xs text-slate-500 font-medium">Show all active vehicles</div>
                </div>
              </div>
            </button>

            <div className="grid gap-3">
              {AVAILABLE_ROUTES.map(route => (
                <button
                  key={route.RouteNo}
                  onClick={() => onSelectRoute(route.RouteNo)}
                  className={`w-full p-3 pr-4 rounded-[1.8rem] text-left transition-all duration-300 border relative overflow-hidden group ${
                    selectedRoute === route.RouteNo 
                      ? 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 shadow-xl' 
                      : 'bg-slate-50 dark:bg-white/5 border-transparent hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  {selectedRoute === route.RouteNo && (
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-100/50 dark:from-white/5 to-transparent pointer-events-none" />
                  )}
                  
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 transition-all" style={{ backgroundColor: route.Color, opacity: selectedRoute === route.RouteNo ? 1 : 0.6 }} />
                  
                  <div className="pl-5 flex items-center justify-between">
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-2xl tracking-tighter text-slate-800 dark:text-slate-100" style={{ textShadow: selectedRoute === route.RouteNo ? `0 0 20px ${route.Color}40` : 'none' }}>{route.RouteNo}</span>
                        <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500/80 px-2 py-1 rounded-lg bg-slate-200 dark:bg-black/40 border border-slate-300 dark:border-white/5">
                          {route.Direction}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[180px] group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                        {route.Name}
                      </div>
                    </div>
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white dark:text-slate-950 font-bold text-xs shadow-lg transition-transform group-hover:scale-110 duration-300"
                      style={{ backgroundColor: route.Color, boxShadow: `0 4px 15px ${route.Color}40` }}
                    >
                      <Bus size={16} className="opacity-80" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {tab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 space-y-5 overflow-y-auto pb-4 min-h-[200px]">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-tr-sm shadow-blue-500/20' 
                        : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-100 rounded-tl-sm border border-slate-200 dark:border-white/5'
                    }`}
                  >
                     {msg.role === 'model' && <Sparkles size={12} className="inline-block mr-1.5 text-amber-500 dark:text-cyan-300 relative -top-0.5" />}
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-3xl rounded-tl-sm border border-slate-200 dark:border-white/5 flex gap-1.5 items-center h-12 w-16 justify-center">
                    <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-cyan-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-cyan-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-cyan-400 rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="mt-auto pt-4 sticky bottom-0">
              <div className="flex gap-2 items-center bg-white/80 dark:bg-black/40 backdrop-blur-xl p-1.5 pr-2 rounded-[2rem] border border-slate-200 dark:border-white/10 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all shadow-xl">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about delays..."
                  className="flex-1 bg-transparent border-none rounded-full px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="p-3 bg-gradient-to-tr from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition-all shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95"
                >
                  <Send size={18} fill="currentColor" className="ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
           <div className="space-y-6 pt-1">
             <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 space-y-5">
                  <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-100 font-bold text-sm pb-3 border-b border-slate-200 dark:border-white/5">
                    <Settings size={16} className="text-cyan-500 dark:text-cyan-400" /> Configuration
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 tracking-wider">API Key</label>
                    <input 
                      type="text" 
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="TransLink API Key"
                      className="w-full bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-800 dark:text-white focus:border-cyan-500 focus:outline-none transition-colors placeholder-slate-400 dark:placeholder-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 flex items-center gap-1 tracking-wider">
                       Custom Proxy (Optional)
                    </label>
                    <input 
                      type="text" 
                      value={proxyInput}
                      onChange={(e) => setProxyInput(e.target.value)}
                      placeholder="https://my-proxy.com/?"
                      className="w-full bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-xs text-slate-800 dark:text-white focus:border-cyan-500 focus:outline-none font-mono placeholder-slate-400 dark:placeholder-slate-600"
                    />
                  </div>

                  <button 
                      onClick={handleSaveKey}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-xl text-sm font-bold tracking-wide shadow-lg shadow-blue-900/30 active:scale-[0.98] transition-all"
                  >
                    Save & Connect
                  </button>
             </div>

             <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-slate-200 dark:border-white/5">
                 <div className="flex items-center justify-between mb-4">
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Data Source</span>
                   <Activity size={16} className="text-slate-400 dark:text-slate-500" />
                 </div>
                 <div className="flex gap-2 p-1.5 bg-slate-200 dark:bg-black/40 rounded-xl border border-slate-300 dark:border-white/5">
                   <button
                    onClick={() => toggleSimulation(false)}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${!isSimulating ? 'bg-emerald-500 dark:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 dark:shadow-emerald-900/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                   >
                     Live API
                   </button>
                   <button
                    onClick={() => toggleSimulation(true)}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${isSimulating ? 'bg-amber-500 dark:bg-amber-600 text-white shadow-lg shadow-amber-500/20 dark:shadow-amber-900/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                   >
                     Simulation
                   </button>
                 </div>
             </div>

             <div className="px-4 py-2">
               <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center leading-relaxed font-medium">
                 VanCity Transit • v1.3.0
                 <br/>
                 {theme === 'dark' ? 'Designed for the night owls.' : 'Brighten up your commute.'}
               </p>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};
