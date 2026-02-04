
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Message, Transaction, DraftTransaction, TransactionType, Contact, Attachment, AttachmentType } from '../types';
import { useWakeWord } from '../hooks/useWakeWord';

interface ChatInterfaceProps {
  messages: Message[];
  contacts: Contact[];
  pendingDrafts: DraftTransaction[];
  onSendMessage: (text: string, attachments?: Attachment[]) => void;
  onConfirmDraft: (draftId: string) => void;
  onDiscardDraft: (draftId: string) => void;
  onUpdateDraft: (draftId: string, updates: Partial<Transaction>) => void;
  isProcessing: boolean;
  recentTransactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  currencySymbol?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  contacts,
  pendingDrafts,
  onSendMessage, 
  onConfirmDraft, 
  onDiscardDraft, 
  onUpdateDraft,
  isProcessing,
  recentTransactions,
  onDeleteTransaction,
  currencySymbol = '$'
}) => {
  const [inputText, setInputText] = useState('');
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [showWakeWordActivated, setShowWakeWordActivated] = useState(false);
  const [isContextExpanded, setIsContextExpanded] = useState(true);
  const [isPendingExpanded, setIsPendingExpanded] = useState(true);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const waveBars = [20, 45, 30, 60, 35, 70, 40, 55, 28, 62, 38, 75, 42, 58, 33, 66, 36, 72, 30, 52, 26, 64, 34, 68];

  const readFileAsDataUrl = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const addAttachmentFromFile = async (file: File, overrideType?: AttachmentType) => {
    const mimeType = file.type || (overrideType === 'audio' ? 'audio/webm' : 'image/png');
    const type: AttachmentType = overrideType || (mimeType.startsWith('audio') ? 'audio' : 'image');
    const dataUrl = await readFileAsDataUrl(file);
    setPendingAttachments(prev => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        type,
        mimeType,
        dataUrl,
        name: file.name,
      }
    ]);
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== id));
  };

  const startRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      mediaChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const dataUrl = await readFileAsDataUrl(blob);
        setPendingAttachments(prev => [
          ...prev,
          {
            id: Math.random().toString(36).slice(2),
            type: 'audio',
            mimeType: blob.type || 'audio/webm',
            dataUrl,
            name: `recording-${Date.now()}.webm`,
          }
        ]);
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  // Wake word detection - "Hey Van" activates voice input
  const handleWakeWordDetected = useCallback(() => {
    setShowWakeWordActivated(true);
    // Play a subtle sound or vibration feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
    // Start recording after a brief delay
    setTimeout(() => {
      if (!isRecording) {
        startRecording();
      }
      setShowWakeWordActivated(false);
    }, 500);
  }, [isRecording]);

  const { isListening: isWakeWordListening, isSupported: isWakeWordSupported } = useWakeWord({
    wakeWord: 'hey van',
    onWakeWordDetected: handleWakeWordDetected,
    enabled: wakeWordEnabled && !isRecording && !isProcessing,
  });

  const openCamera = async () => {
    if (isCameraOpen) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.onloadedmetadata = () => {
          cameraVideoRef.current?.play().catch(() => undefined);
        };
      }
      setIsCameraOpen(true);
    } catch {
      fileInputRef.current?.click();
    }
  };

  const closeCamera = () => {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    cameraStreamRef.current = null;
    setIsCameraOpen(false);
  };

  const capturePhoto = async () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPendingAttachments(prev => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        type: 'image',
        mimeType: 'image/jpeg',
        dataUrl,
        name: `camera-${Date.now()}.jpg`,
      }
    ]);
    closeCamera();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, pendingDrafts]);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!isCameraOpen) return;
    if (cameraVideoRef.current && cameraStreamRef.current) {
      cameraVideoRef.current.srcObject = cameraStreamRef.current;
      cameraVideoRef.current.onloadedmetadata = () => {
        cameraVideoRef.current?.play().catch(() => undefined);
      };
    }
  }, [isCameraOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    const hasAttachments = pendingAttachments.length > 0;
    if ((trimmed || hasAttachments) && !isProcessing) {
      onSendMessage(trimmed, pendingAttachments);
      setInputText('');
      setPendingAttachments([]);
      if (pendingDrafts.length > 0) {
        setIsPendingExpanded(false);
      }
    }
  };

  const getTypeStyles = (type: TransactionType) => {
    switch (type) {
      case 'income': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'expense': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'credit_receivable':
      case 'loan_receivable': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'credit_payable':
      case 'loan_payable': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'payment_received': return 'bg-teal-50 text-teal-600 border-teal-100';
      case 'payment_made': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'transfer': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  // Get open debts for linking payments
  const openDebts = useMemo(() => {
    return recentTransactions.filter(t => 
      ['credit_receivable', 'credit_payable', 'loan_receivable', 'loan_payable'].includes(t.type) &&
      t.status !== 'settled'
    );
  }, [recentTransactions]);

  const pendingReviewCount = pendingDrafts.length;

  const contactSuggestions = useMemo(() => {
    if (!contactSearch.trim()) return [];
    return contacts.filter(c => 
      c.name.toLowerCase().includes(contactSearch.toLowerCase())
    ).slice(0, 5);
  }, [contactSearch, contacts]);

  const handleContactChange = (draftId: string, val: string) => {
    setContactSearch(val);
    onUpdateDraft(draftId, { contact: val });
  };

  const selectContact = (draftId: string, contact: Contact) => {
    onUpdateDraft(draftId, { contact: contact.name, contactId: contact.id });
    setContactSearch('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await addAttachmentFromFile(file);
    }
    e.target.value = '';
  };

  const toggleAudio = (id: string) => {
    const current = audioRefs.current.get(id);
    if (!current) return;
    if (playingAudioId === id) {
      current.pause();
      setPlayingAudioId(null);
      return;
    }
    audioRefs.current.forEach((audioEl, key) => {
      if (key !== id) audioEl.pause();
    });
    current.play().catch(() => undefined);
    setPlayingAudioId(id);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      
      {recentTransactions.length > 0 && (
        <div className="bg-white/70 backdrop-blur-sm border-b border-slate-100 p-3 z-10">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Context Feed</span>
            <button
              type="button"
              onClick={() => setIsContextExpanded(prev => !prev)}
              className="text-[7px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600"
            >
              {isContextExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {isContextExpanded && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {recentTransactions.map(tx => {
                const typeLabel = {
                  'income': 'Income',
                  'expense': 'Expense',
                  'credit_receivable': 'Credit Sale',
                  'credit_payable': 'Credit Purchase',
                  'loan_receivable': 'Lent',
                  'loan_payable': 'Borrowed',
                  'payment_received': 'Received',
                  'payment_made': 'Paid',
                  'transfer': 'Transfer'
                }[tx.type] || tx.type;
                
                const typeColor = {
                  'income': 'text-emerald-600 bg-emerald-50',
                  'expense': 'text-rose-600 bg-rose-50',
                  'credit_receivable': 'text-emerald-600 bg-emerald-50',
                  'credit_payable': 'text-rose-600 bg-rose-50',
                  'loan_receivable': 'text-indigo-600 bg-indigo-50',
                  'loan_payable': 'text-amber-600 bg-amber-50',
                  'payment_received': 'text-teal-600 bg-teal-50',
                  'payment_made': 'text-orange-600 bg-orange-50',
                  'transfer': 'text-blue-600 bg-blue-50'
                }[tx.type] || 'text-slate-500 bg-slate-50';

                return (
                  <div key={tx.id} className="min-w-[140px] bg-white rounded-xl border border-slate-50 p-2 shadow-sm flex flex-col shrink-0">
                    <div className="flex justify-between items-start">
                      <span className={`text-[6px] font-black uppercase px-1.5 py-0.5 rounded-full ${typeColor}`}>{typeLabel}</span>
                      <button onClick={() => onDeleteTransaction(tx.id)} className="text-slate-200 hover:text-rose-500">
                        <i className="fas fa-times text-[7px]"></i>
                      </button>
                    </div>
                    <span className="text-[9px] font-black text-slate-900 truncate mt-1">{tx.description || 'Entry'}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-black text-indigo-600">{currencySymbol}{tx.amount}</span>
                      {tx.contact && <span className="text-[7px] font-bold text-indigo-400">@{tx.contact}</span>}
                    </div>
                    {tx.dueDate && <span className="text-[6px] font-black text-rose-400 uppercase">Due {new Date(tx.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-6 pb-28">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-10 animate-in fade-in zoom-in duration-700">
            <div className="w-16 h-16 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-indigo-50">
              <i className="fas fa-sparkles text-indigo-500 text-2xl"></i>
            </div>
            <h3 className="font-black text-slate-900 text-lg mb-2">Sync anything.</h3>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
              Log transactions, set reminders, or manage debt.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const hasDrafts = msg.drafts && msg.drafts.length > 0;
          
          return (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              {/* Drafts get a full width container style */}
              <div className={`p-4 rounded-3xl text-[13px] font-semibold leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-100 max-w-[88%]' 
                  : hasDrafts 
                    ? 'bg-transparent text-slate-800 p-0 w-full' // Full width for draft-containing assistant messages
                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-sm max-w-[88%]'
              }`}>
                {!hasDrafts && (
                  <div>
                    {msg.content && <div>{msg.content}</div>}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex flex-col gap-2">
                        {msg.attachments.map(att => (
                          <div key={att.id} className="rounded-2xl overflow-hidden border border-slate-100 bg-white">
                            {att.type === 'image' ? (
                              <img src={att.dataUrl} alt={att.name || 'attachment'} className="w-full h-auto object-cover" />
                            ) : (
                              <div className="px-3 py-2 bg-slate-50">
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleAudio(att.id)}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center ${playingAudioId === att.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
                                  >
                                    <i className={`fas ${playingAudioId === att.id ? 'fa-pause' : 'fa-play'} text-[10px]`}></i>
                                  </button>
                                  <div className="flex items-end gap-[2px] h-6 flex-1">
                                    {waveBars.map((h, i) => (
                                      <div
                                        key={`${att.id}-bar-${i}`}
                                        className={`w-1 rounded-full ${playingAudioId === att.id ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                        style={{ height: `${h}%` }}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <audio
                                  ref={(el) => {
                                    if (el) audioRefs.current.set(att.id, el);
                                  }}
                                  src={att.dataUrl}
                                  onEnded={() => {
                                    if (playingAudioId === att.id) setPlayingAudioId(null);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {hasDrafts && (
                  <div className="flex flex-col gap-4">
                    {msg.content && (
                      <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-slate-100 shadow-sm max-w-[88%] mb-2">
                        {msg.content}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-start">
            <div className="bg-white px-3 py-2 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1 items-center shadow-sm">
              <div className="w-1 h-1 bg-indigo-200 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}

        {pendingDrafts.length > 0 && (
          <div className="mt-2">
            <div className="flex justify-between items-center px-1 mb-2">
              <span className="text-[8px] font-black uppercase tracking-widest text-rose-500">Pending Review ({pendingDrafts.length})</span>
              <button
                type="button"
                onClick={() => setIsPendingExpanded(prev => !prev)}
                className="text-[7px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600"
              >
                {isPendingExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>
            <div className="px-1 mb-2">
              <div className="text-[8px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-2xl px-3 py-2 leading-relaxed">
                Review and tap <span className="text-slate-800">Sync Now</span> to record. AI never auto-syncs, even if asked. You are responsible for what gets recorded.
              </div>
            </div>
            {isPendingExpanded && (
              <div className={`flex gap-3 overflow-x-auto no-scrollbar py-2`}>
                {pendingDrafts.map((draft, index) => {
                  const isFinancialRelation = ['credit_receivable', 'credit_payable', 'loan_receivable', 'loan_payable'].includes(draft.type);
                  const isPayment = ['payment_received', 'payment_made'].includes(draft.type);

                  return (
                    <div
                      key={draft.id}
                      className={`p-3 rounded-3xl border bg-slate-50 transition-all min-w-[240px] max-w-[300px] ${
                        editingDraftId === draft.id ? 'ring-2 ring-indigo-500 border-indigo-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="text-[9px] font-black text-slate-400">#{index + 1}</div>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-black shrink-0 ${getTypeStyles(draft.type)}`}>
                            {draft.description ? draft.description.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="min-w-0 flex-1 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-[12px] font-black text-slate-900 truncate">{draft.description || 'Extracted Entry'}</div>
                              <div className="text-[7px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1 mt-1">
                                {draft.type.replace('_up', '').replace('_down', '').replace('_', ' ')} {draft.contact && <span className="text-indigo-400 truncate">@{draft.contact}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-base font-black text-slate-900 leading-none">{currencySymbol}{draft.amount.toLocaleString()}</div>
                              <div className="text-[6px] font-bold text-slate-400 uppercase mt-1">{new Date(draft.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                              {draft.dueDate && <div className="text-[6px] font-black text-rose-500 uppercase">Due {new Date(draft.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>}
                            </div>
                          </div>
                        </div>
                        {['payment_received', 'payment_made'].includes(draft.type) && draft.linkedTransactionId && (
                          <div className="text-[8px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-xl px-2 py-1">
                            Linked: {openDebts.find(d => d.id === draft.linkedTransactionId)?.description || 'Debt'}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                          <button type="button" onClick={() => onConfirmDraft(draft.id)} className="flex-[4] py-2.5 bg-slate-900 text-white rounded-2xl text-[8px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-100">Sync Now</button>
                          <button type="button" onClick={() => { setEditingDraftId(draft.id); setContactSearch(''); }} className="flex-1 py-2.5 flex items-center justify-center text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-2xl transition-colors"><i className="fas fa-pen text-[10px]"></i></button>
                          <button type="button" onClick={() => onDiscardDraft(draft.id)} className="flex-1 py-2.5 flex items-center justify-center text-slate-400 hover:text-rose-600 bg-slate-50 rounded-2xl transition-colors"><i className="fas fa-trash text-[10px]"></i></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {editingDraftId && (
          <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" onClick={() => { setEditingDraftId(null); setLinkSearch(''); }}>
            <div className="w-[92%] max-w-sm bg-white rounded-3xl border border-slate-100 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
              {(() => {
                const draft = pendingDrafts.find(d => d.id === editingDraftId);
                if (!draft) return null;
                const isFinancialRelation = ['credit_receivable', 'credit_payable', 'loan_receivable', 'loan_payable'].includes(draft.type);
                const isPayment = ['payment_received', 'payment_made'].includes(draft.type);
                const linkedTx = draft.linkedTransactionId
                  ? openDebts.find(d => d.id === draft.linkedTransactionId)
                  : undefined;
                const filteredDebts = openDebts.filter(debt => {
                  if (!linkSearch.trim()) return true;
                  const term = linkSearch.toLowerCase();
                  return (
                    debt.description.toLowerCase().includes(term) ||
                    (debt.contact || '').toLowerCase().includes(term)
                  );
                });
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Edit Entry</h4>
                      <button type="button" onClick={() => { setEditingDraftId(null); setLinkSearch(''); }} className="text-slate-400 hover:text-slate-600">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>

                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Type</label>
                      <div className="bg-slate-50 p-1 rounded-xl flex flex-wrap gap-1">
                        {[
                          { id: 'expense', label: 'Expense', icon: 'fa-minus-circle' },
                          { id: 'income', label: 'Income', icon: 'fa-plus-circle' },
                          { id: 'credit_receivable', label: 'Credit Sale', icon: 'fa-hand-holding-dollar' },
                          { id: 'credit_payable', label: 'Credit Buy', icon: 'fa-receipt' },
                          { id: 'loan_receivable', label: 'Lent', icon: 'fa-hand-holding-hand' },
                          { id: 'loan_payable', label: 'Borrowed', icon: 'fa-money-bill-transfer' },
                          { id: 'payment_received', label: 'Received', icon: 'fa-arrow-down' },
                          { id: 'payment_made', label: 'Paid', icon: 'fa-arrow-up' }
                        ].map((typeOpt) => (
                          <button
                            key={typeOpt.id}
                            type="button"
                            onClick={() => onUpdateDraft(draft.id, { type: typeOpt.id as TransactionType })}
                            className={`flex-1 min-w-[64px] flex flex-col items-center py-2 px-1 rounded-lg transition-all ${draft.type === typeOpt.id ? 'bg-white shadow-sm ring-1 ring-slate-100 scale-105' : 'opacity-40 grayscale hover:opacity-100'}`}
                          >
                            <i className={`fas ${typeOpt.icon} text-[11px] mb-1 ${draft.type === typeOpt.id ? 'text-indigo-600' : ''}`}></i>
                            <span className={`text-[7px] font-black uppercase tracking-tighter ${draft.type === typeOpt.id ? 'text-slate-900' : 'text-slate-400'}`}>
                              {typeOpt.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Description</label>
                      <input type="text" className="w-full p-3 text-[12px] font-bold border border-slate-100 rounded-xl bg-slate-50 outline-none" value={draft.description} onChange={(e) => onUpdateDraft(draft.id, { description: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Amount</label>
                        <input type="number" className="w-full p-3 text-[12px] font-black border border-slate-100 rounded-xl bg-slate-50 outline-none" value={draft.amount} onChange={(e) => onUpdateDraft(draft.id, { amount: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Date</label>
                        <input type="date" className="w-full p-3 text-[12px] font-bold border border-slate-100 rounded-xl bg-slate-50 outline-none" value={draft.date ? draft.date.split('T')[0] : ''} onChange={(e) => onUpdateDraft(draft.id, { date: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Category</label>
                        <input type="text" className="w-full p-3 text-[12px] font-bold border border-slate-100 rounded-xl bg-slate-50 outline-none" value={draft.category} onChange={(e) => onUpdateDraft(draft.id, { category: e.target.value })} />
                      </div>
                    </div>

                    <div className={`grid gap-2 animate-in slide-in-from-top-2 duration-300 ${isFinancialRelation ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      <div className="relative">
                        <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Contact</label>
                        <input 
                          type="text" 
                          className="w-full p-3 text-[12px] font-bold border border-slate-100 rounded-xl bg-slate-50 outline-none" 
                          value={draft.contact || ''} 
                          onChange={(e) => handleContactChange(draft.id, e.target.value)} 
                          placeholder="Search..."
                        />
                        {contactSuggestions.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-100 shadow-2xl rounded-xl overflow-hidden animate-in fade-in duration-200">
                            {contactSuggestions.map(c => (
                              <button 
                                key={c.id} 
                                onClick={() => selectContact(draft.id, c)}
                                className="w-full px-3 py-2 text-left text-[10px] font-black hover:bg-slate-50 border-b border-slate-50 last:border-0"
                              >
                                <span className="text-slate-900">{c.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {isFinancialRelation && (
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Due Date</label>
                          <input type="date" className="w-full p-3 text-[12px] font-bold border border-slate-100 rounded-xl bg-slate-50 outline-none" value={draft.dueDate ? draft.dueDate.split('T')[0] : ''} onChange={(e) => onUpdateDraft(draft.id, { dueDate: e.target.value })} />
                        </div>
                      )}
                    </div>

                    {isPayment && openDebts.length > 0 && (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <label className="text-[8px] font-black text-slate-400 uppercase block mb-2">Link to Open Debt</label>
                        {linkedTx && (
                          <div className="mb-2 p-2 rounded-xl border border-indigo-100 bg-indigo-50 text-[9px] font-bold text-indigo-700">
                            Linked: {linkedTx.description} {linkedTx.contact ? `@${linkedTx.contact}` : ''}
                          </div>
                        )}
                        <input
                          type="text"
                          value={linkSearch}
                          onChange={(e) => setLinkSearch(e.target.value)}
                          placeholder="Search debts..."
                          className="w-full mb-2 p-2.5 text-[11px] font-bold border border-slate-100 rounded-xl bg-slate-50 outline-none"
                        />
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {filteredDebts.map(debt => {
                            const remaining = debt.remainingAmount ?? debt.amount;
                            const isSelected = draft.linkedTransactionId === debt.id;
                            const isReceivable = ['credit_receivable', 'loan_receivable'].includes(debt.type);
                            return (
                              <button
                                key={debt.id}
                                type="button"
                                onClick={() => onUpdateDraft(draft.id, { 
                                  linkedTransactionId: isSelected ? undefined : debt.id,
                                  contact: isSelected ? draft.contact : debt.contact
                                })}
                                className={`w-full p-2 rounded-xl text-left transition-all ${
                                  isSelected 
                                    ? 'bg-indigo-100 ring-2 ring-indigo-500' 
                                    : 'bg-slate-50 hover:bg-slate-100'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-[9px] font-black text-slate-900">{debt.description}</div>
                                    <div className="text-[7px] font-bold text-slate-400">
                                      {debt.contact && <span className="text-indigo-500">@{debt.contact} • </span>}
                                      <span className={isReceivable ? 'text-emerald-500' : 'text-rose-500'}>
                                        {isReceivable ? 'They owe you' : 'You owe them'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-[10px] font-black text-slate-900">{currencySymbol}{remaining.toLocaleString()}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {draft.linkedTransactionId && (
                          <div className="mt-2 text-[8px] font-bold text-emerald-600">
                            <i className="fas fa-link mr-1"></i>Linked to debt
                          </div>
                        )}
                      </div>
                    )}

                    <button type="button" onClick={() => setEditingDraftId(null)} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Done</button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="absolute bottom-6 left-5 right-5 z-40">
        <form onSubmit={handleSubmit} className="shadow-2xl shadow-indigo-100/30">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          {pendingAttachments.length > 0 && (
            <div className="mb-2 flex gap-2 overflow-x-auto no-scrollbar">
              {pendingAttachments.map(att => (
                <div key={att.id} className="relative shrink-0">
                  {att.type === 'image' ? (
                    <img src={att.dataUrl} alt={att.name || 'attachment'} className="w-16 h-16 rounded-2xl object-cover border border-slate-100" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center border border-slate-800 text-[10px] font-black">
                      AUDIO
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border border-slate-100 text-slate-400 flex items-center justify-center shadow-sm hover:text-rose-500"
                  >
                    <i className="fas fa-times text-[8px]"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-md shadow-indigo-100 hover:scale-105 transition-all"
            >
              <i className="fas fa-image"></i>
            </button>
            <button
              type="button"
              onClick={openCamera}
              disabled={isProcessing}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-md shadow-emerald-100 hover:scale-105 transition-all"
            >
              <i className="fas fa-camera"></i>
            </button>
            <button
              type="button"
              onClick={() => (isRecording ? stopRecording() : startRecording())}
              disabled={isProcessing}
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center shadow-md transition-all ${
                isRecording
                  ? 'bg-rose-600 text-white border-rose-500 shadow-rose-200 scale-105'
                  : 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 border-amber-200 shadow-amber-100 hover:scale-105'
              }`}
            >
              <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
            </button>
            {/* Wake Word Toggle */}
            {isWakeWordSupported && (
              <button
                type="button"
                onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
                className={`w-10 h-10 rounded-2xl border flex items-center justify-center shadow-md transition-all relative ${
                  wakeWordEnabled
                    ? 'bg-gradient-to-br from-violet-50 to-violet-100 text-violet-700 border-violet-200 shadow-violet-100'
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
                title={wakeWordEnabled ? 'Say "Hey Van" to activate voice' : 'Wake word disabled'}
              >
                <i className="fas fa-assistive-listening-systems text-sm"></i>
                {wakeWordEnabled && isWakeWordListening && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="What should I extract?"
              disabled={isProcessing}
              className="w-full pl-6 pr-14 py-4 bg-white/95 backdrop-blur border border-slate-50 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-bold text-sm text-slate-800 placeholder:text-slate-300 shadow-xl"
            />
            <button
              type="submit"
              disabled={(!inputText.trim() && pendingAttachments.length === 0) || isProcessing}
              className="absolute right-2 top-2 bottom-2 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-100"
            >
              <i className="fas fa-chevron-up text-sm"></i>
            </button>
          </div>
        </form>
      </div>

      {isCameraOpen && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center">
          <div className="w-full max-w-md mx-auto p-4">
            <div className="bg-black rounded-3xl overflow-hidden border border-white/10">
              <div className="relative">
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto object-cover"
                />
                <button
                  type="button"
                  onClick={closeCamera}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-slate-700 flex items-center justify-center"
                >
                  <i className="fas fa-times text-[10px]"></i>
                </button>
              </div>
              <div className="p-4 bg-white flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Camera</span>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200"
                >
                  <i className="fas fa-camera text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wake Word Activated Overlay */}
      {showWakeWordActivated && (
        <div className="fixed inset-0 z-[300] bg-violet-600/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="text-center text-white">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <i className="fas fa-microphone text-4xl"></i>
            </div>
            <h2 className="text-2xl font-black mb-2">Hey Van!</h2>
            <p className="text-white/70 text-sm font-bold">Listening...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
