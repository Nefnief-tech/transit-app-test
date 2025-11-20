
import React, { useState, useEffect, useRef } from 'react';
import { Route, ChatMessage, BusLocation } from '../types';
import { AVAILABLE_ROUTES } from '../constants';
import { geminiService } from '../services/geminiService';
import { Bus, MessageSquare, Send, AlertCircle, Settings, X, Radio, Activity, Globe } from 'lucide-react';
import { transitService } from '../services/transitService';

interface SidebarProps {
  selectedRoute: string | null;
  onSelectRoute: (routeNo: string | null) => void;
  activeBuses: BusLocation[];
  onSetApiKey: (key: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ selectedRoute, onSelectRoute, activeBuses, onSetApiKey }) => {
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tab]);

  // Check simulation status on mount and updates
  useEffect(() => {
    setIsSimulating(transitService.isSimulationMode());
  }, [tab]); // Update when switching tabs

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

    // Convert messages for service
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
    // Reset simulation when saving key as per request to use real data
    transitService.toggleSimulation(false); 
    setIsSimulating(false);
    onSetApiKey(apiKeyInput);
    alert("Settings saved. Fetching real-time data...");
  };

  const toggleSimulation = (enabled: boolean) => {
    transitService.toggleSimulation(enabled);
    setIsSimulating(enabled);
    onSetApiKey(apiKeyInput); // Trigger data refresh
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800 w-full md:w-96 shadow-2xl z-[1000]">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            VanCity Transit
          </h1>
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
             <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-amber-500' : 'bg-green-500 animate-pulse'}`}></span>
             <span className={isSimulating ? 'text-amber-500' : 'text-green-500'}>
               {isSimulating ? 'Simulation' : 'Live Data'}
             </span>
          </div>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => setTab('settings')}
            className={`p-2 rounded-lg transition-colors ${tab === 'settings' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800">
        <button 
          onClick={() => setTab('routes')}
          className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
            ${tab === 'routes' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <Bus size={16} /> Routes
        </button>
        <button 
          onClick={() => setTab('chat')}
          className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
            ${tab === 'chat' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/50' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <MessageSquare size={16} /> Assistant
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto relative">
        
        {/* Routes Tab */}
        {tab === 'routes' && (
          <div className="p-2 space-y-2">
            {isSimulating ? (
              <div className="bg-amber-900/20 border border-amber-500/30 p-3 rounded-lg m-2 text-xs text-amber-200 flex gap-2 items-start">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <p>Running in simulation mode.</p>
              </div>
            ) : (
              <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg m-2 text-xs text-blue-200 flex gap-2 items-start">
                <Activity size={14} className="mt-0.5 shrink-0" />
                <p>Using Real-Time TransLink API.</p>
              </div>
            )}
            
            <button
              onClick={() => onSelectRoute(null)}
              className={`w-full p-3 rounded-xl text-left transition-all duration-200 border ${
                selectedRoute === null 
                  ? 'bg-slate-800 border-slate-600 shadow-lg' 
                  : 'bg-slate-900/50 border-transparent hover:bg-slate-800'
              }`}
            >
              <span className="font-medium text-slate-200">Show All Routes</span>
            </button>

            {AVAILABLE_ROUTES.map(route => (
              <button
                key={route.RouteNo}
                onClick={() => onSelectRoute(route.RouteNo)}
                className={`w-full p-3 rounded-xl text-left transition-all duration-200 border group relative overflow-hidden ${
                  selectedRoute === route.RouteNo 
                    ? 'bg-slate-800 border-slate-600 shadow-lg' 
                    : 'bg-slate-900/50 border-transparent hover:bg-slate-800'
                }`}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 transition-colors" style={{ backgroundColor: route.Color }} />
                <div className="pl-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-lg text-slate-100">{route.RouteNo}</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 px-2 py-0.5 rounded bg-slate-950">
                      {route.Direction}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 truncate group-hover:text-slate-300">
                    {route.Name}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Chat Tab */}
        {tab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-tr-sm shadow-lg shadow-emerald-900/20' 
                        : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-sm border border-slate-700 flex gap-1">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-slate-900 border-t border-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about routes..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-500"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
           <div className="p-4 space-y-6">
             <div className="space-y-2">
               <h3 className="text-lg font-medium text-white">TransLink API Settings</h3>
               <p className="text-sm text-slate-400">
                 Configure your API connection.
               </p>
               <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mt-2 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key</label>
                    <input 
                      type="text" 
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Enter TransLink API Key"
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                       <Globe size={12} /> Custom CORS Proxy (Optional)
                    </label>
                    <input 
                      type="text" 
                      value={proxyInput}
                      onChange={(e) => setProxyInput(e.target.value)}
                      placeholder="e.g., https://my-proxy.workers.dev/?url="
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none font-mono text-xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Leave empty to use default public proxies (AllOrigins, CodeTabs).
                    </p>
                  </div>

                  <button 
                      onClick={handleSaveKey}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Save Settings & Fetch Data
                  </button>
               </div>

               <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mt-4">
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-sm font-medium text-slate-200">Data Source</span>
                 </div>
                 <div className="flex gap-2 p-1 bg-slate-900 rounded-lg">
                   <button
                    onClick={() => toggleSimulation(false)}
                    className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${!isSimulating ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                   >
                     Live API
                   </button>
                   <button
                    onClick={() => toggleSimulation(true)}
                    className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${isSimulating ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                   >
                     Simulation
                   </button>
                 </div>
               </div>

             </div>
             <div className="pt-4 border-t border-slate-800">
               <h4 className="text-sm font-medium text-slate-300 mb-2">About</h4>
               <p className="text-xs text-slate-500">
                 This application uses the TransLink RTTI Open API. 
                 GTFS-RT feeds are not used due to browser CORS/Protobuf limitations.
                 <br/><br/>
                 If data fails to load, try switching between Live/Simulation or use a custom proxy.
               </p>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};
