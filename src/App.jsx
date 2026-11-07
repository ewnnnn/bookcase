import React, { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, updateDoc, deleteDoc, onSnapshot, addDoc } from 'firebase/firestore';
import {
  Book, BookOpen, Library, Settings as SettingsIcon, LogOut, Search, Plus, Trash2,
  Camera, PieChart as PieChartIcon, BarChart3, Menu, X,
  CheckCircle, AlertCircle, TrendingUp, DollarSign, Image as ImageIcon,
  Moon, Sun, QrCode, XCircle
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// --- Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyBh9Um8hFFQ0vSimvmdpc7wY5aAbYDGUDU",
  authDomain: "book-c8b96.firebaseapp.com",
  projectId: "book-c8b96",
  storageBucket: "book-c8b96.firebasestorage.app",
  messagingSenderId: "174756185156",
  appId: "1:174756185156:web:7c1fda17807d27e1ad6811",
  measurementId: "G-G8B18SJWE5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'book-app-default';

// --- Contexts ---
const ToastContext = createContext(null);
const ThemeContext = createContext(null);

// --- Custom Hooks & Providers ---
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);
  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-sm shadow-lg text-[#f4ebd8] border transition-all duration-300 animate-fade-in-up font-serif ${t.type === 'success' ? 'bg-[#4a5e42] border-[#2e3b29]' : t.type === 'error' ? 'bg-[#a63c3c] border-[#5e2323]' : 'bg-[#b38b4d] border-[#73562a]'}`}>
            {t.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium text-sm tracking-wide">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const useToast = () => useContext(ToastContext);

// --- Utilities ---
const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};

const getCollectionPath = (userId, collectionName) => `artifacts/${appId}/users/${userId}/${collectionName}`;

// --- UI Components ---
const Card = ({ children, className = '' }) => (
  <div className={`bg-[#fdfbf7] dark:bg-[#2c1f16] border border-[#d2c3a5] dark:border-[#4a3525] rounded-sm shadow-[2px_4px_8px_rgba(92,58,33,0.15)] dark:shadow-[2px_4px_8px_rgba(0,0,0,0.5)] overflow-hidden relative ${className}`}>
    <div className="absolute inset-0 opacity-[0.03] dark:opacity-10 pointer-events-none mix-blend-multiply dark:mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
    <div className="relative z-10 h-full flex flex-col">{children}</div>
  </div>
);

const Button = ({ children, variant = 'primary', icon: Icon, className = '', isLoading, ...props }) => {
  const base = "relative overflow-hidden flex items-center justify-center gap-2 px-4 py-2 font-serif font-semibold tracking-wider rounded-sm transition-all duration-300 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100";
  const variants = {
    primary: "bg-gradient-to-b from-[#7a2e2e] to-[#4a1c1c] text-[#f4ebd8] shadow-[0_2px_4px_rgba(0,0,0,0.4)] border border-[#301212] hover:from-[#8c3535] hover:to-[#5e2323]",
    secondary: "bg-gradient-to-b from-[#f4ebd8] to-[#e6d5b8] dark:from-[#4a3525] dark:to-[#382619] text-[#5c3a21] dark:text-[#e8dcc7] border border-[#c8b89e] dark:border-[#2a1d13] shadow-sm hover:from-[#fff] hover:to-[#f4ebd8] dark:hover:from-[#5c402c] dark:hover:to-[#4a3525]",
    danger: "bg-gradient-to-b from-[#a63c3c] to-[#732727] text-[#f4ebd8] border border-[#4a1717] shadow-sm hover:from-[#ba4545] hover:to-[#8a3030]",
    ghost: "text-[#7a5a41] dark:text-[#a89078] hover:bg-[#e6d5b8]/40 dark:hover:bg-[#4a3525]/50 border border-transparent"
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={isLoading} {...props}>
      {isLoading ? <div className="w-5 h-5 border-2 border-[#d2c3a5]/30 border-t-[#d2c3a5] rounded-full animate-spin" /> : Icon && <Icon size={18} />}
      {!isLoading && children}
    </button>
  );
};

const Input = ({ label, icon: Icon, error, ...props }) => (
  <div className="flex flex-col gap-1 w-full font-serif">
    {label && <label className="text-sm font-bold text-[#5c3a21] dark:text-[#d2c3a5] ml-1">{label}</label>}
    <div className="relative">
      {Icon && <Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b5a2b] dark:text-[#8b5a2b]" />}
      <input
        className={`w-full bg-[#fdfbf7] dark:bg-[#1e150e] border ${error ? 'border-[#a63c3c] focus:ring-[#a63c3c]/20' : 'border-[#c8b89e] dark:border-[#4a3525] focus:ring-[#7a2e2e]/20'} rounded-sm px-4 py-2.5 ${Icon ? 'pl-10' : ''} text-[#4a2e16] dark:text-[#e8dcc7] focus:outline-none focus:border-[#7a2e2e] dark:focus:border-[#b38b4d] shadow-inner transition-all placeholder:text-[#a89078] dark:placeholder:text-[#5c402c]`}
        {...props}
      />
    </div>
    {error && <span className="text-xs text-[#a63c3c] ml-1 font-bold">{error}</span>}
  </div>
);

const Select = ({ label, options, error, ...props }) => (
  <div className="flex flex-col gap-1 w-full font-serif">
    {label && <label className="text-sm font-bold text-[#5c3a21] dark:text-[#d2c3a5] ml-1">{label}</label>}
    <select
      className={`w-full bg-[#fdfbf7] dark:bg-[#1e150e] border ${error ? 'border-[#a63c3c]' : 'border-[#c8b89e] dark:border-[#4a3525]'} rounded-sm px-4 py-2.5 text-[#4a2e16] dark:text-[#e8dcc7] focus:outline-none focus:border-[#7a2e2e] dark:focus:border-[#b38b4d] shadow-inner transition-all appearance-none`}
      {...props}
    >
      <option value="" disabled>請選擇</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1a120c]/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-[#fdfbf7] dark:bg-[#2c1f16] rounded-sm shadow-[0_15px_40px_rgba(0,0,0,0.6)] overflow-hidden border border-[#d2c3a5] dark:border-[#543d2d] animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between p-5 border-b-2 border-double border-[#d2c3a5] dark:border-[#543d2d] bg-[#f4ebd8] dark:bg-[#382619]">
          <h3 className="text-xl font-bold font-serif text-[#4a2e16] dark:text-[#e8dcc7]">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#e6d5b8] dark:hover:bg-[#4a3525] text-[#7a5a41] dark:text-[#a89078] transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar relative">
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-10 pointer-events-none mix-blend-multiply dark:mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] z-0"></div>
          <div className="relative z-10">{children}</div>
        </div>
      </div>
    </div>
  );
};

// --- Features ---

// 1. Scanner Component
const ISBNScanner = ({ onScanSuccess, onClose }) => {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let stream = null;
    let detector = null;
    let animationFrameId;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Check for native BarcodeDetector API (Chrome/Android)
        if ('BarcodeDetector' in window) {
          detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8'] });
          const detectLoop = async () => {
            if (!videoRef.current || !isScanning) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const isbn = barcodes[0].rawValue;
                // Basic ISBN validation (starts with 978/979 or 10 digits)
                if (isbn.length >= 10) {
                  setIsScanning(false);
                  onScanSuccess(isbn);
                  return; // Stop loop
                }
              }
            } catch (e) {
              // Ignore frame errors
            }
            animationFrameId = requestAnimationFrame(detectLoop);
          };
          // Start detection after video is ready
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            detectLoop();
          };
        } else {
          setError("此裝置/瀏覽器不支援原生條碼掃描功能，請手動輸入 ISBN。");
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("無法存取相機，請檢查權限或改為手動輸入。");
      }
    };

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden shadow-inner flex flex-col items-center justify-center">
      {error ? (
        <div className="text-center p-6 flex flex-col items-center gap-3">
          <XCircle className="text-rose-400" size={32} />
          <p className="text-white/80 text-sm">{error}</p>
          <Button variant="secondary" size="sm" onClick={onClose}>關閉相機</Button>
        </div>
      ) : (
        <>
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
          <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-green-400 rounded-lg pointer-events-none">
            <div className="absolute w-full h-0.5 bg-green-400 top-1/2 animate-scan-line"></div>
          </div>
          <p className="absolute bottom-4 text-white bg-black/50 px-3 py-1 rounded-full text-xs animate-pulse">
            請將 ISBN 條碼對準框內
          </p>
        </>
      )}
    </div>
  );
};

// 2. Book Form Component
const BookForm = ({ initialData, onSave, onCancel, userId }) => {
  const showToast = useToast();
  const [formData, setFormData] = useState(initialData || {
    title: '', author: '', isbn: '', category: '', location: '',
    price: '', pageCount: '', status: 'unread', notes: '', coverUrl: '',
    purchaseDate: new Date().toISOString().split('T')[0]
  });
  const [isSearching, setIsSearching] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = '書名為必填';
    if (!formData.category) newErrors.category = '請選擇分類';
    if (formData.price < 0) newErrors.price = '價格不能為負數';
    if (formData.pageCount < 0) newErrors.pageCount = '頁數不能為負數';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchBookInfo = async (searchIsbn) => {
    const isbnToSearch = (searchIsbn || formData.isbn).trim();
    if (!isbnToSearch) {
      showToast('請輸入 ISBN', 'error');
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnToSearch}`);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const info = data.items[0].volumeInfo;
        setFormData(prev => ({
          ...prev,
          title: info.title || prev.title,
          author: info.authors ? info.authors.join(', ') : prev.author,
          pageCount: info.pageCount || prev.pageCount,
          coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:') || prev.coverUrl,
          isbn: isbnToSearch
        }));
        showToast('已自動帶入書籍資訊');
      } else {
        showToast('查無此書籍資訊，請改為手動輸入', 'error');
      }
    } catch (err) {
      showToast('查詢失敗，請檢查網路狀態', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const cleanedData = Object.keys(formData).reduce((acc, key) => {
        acc[key] = typeof formData[key] === 'string' ? formData[key].trim() : formData[key];
        return acc;
      }, {});
      cleanedData.price = Number(cleanedData.price) || 0;
      cleanedData.pageCount = Number(cleanedData.pageCount) || 0;
      cleanedData.updatedAt = new Date().toISOString();
      if (!initialData) cleanedData.createdAt = new Date().toISOString();
      onSave(cleanedData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Cover Preview & Scanner Section */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="aspect-[2/3] w-full bg-[#f4ebd8] dark:bg-[#1e150e] rounded-sm flex items-center justify-center overflow-hidden border-2 border-dashed border-[#c8b89e] dark:border-[#4a3525] shadow-inner group relative">
            {formData.coverUrl ? (
              <img src={formData.coverUrl} alt="Cover Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="flex flex-col items-center text-[#a89078] dark:text-[#5c402c] font-serif">
                <ImageIcon size={48} className="mb-2 opacity-50" />
                <span className="text-sm font-bold tracking-widest">藏書封面</span>
              </div>
            )}
            <div className="absolute inset-0 bg-[#2c1f16]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
               <span className="text-[#e8dcc7] text-sm font-bold font-serif tracking-widest border border-[#e8dcc7] px-4 py-2">預覽</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
             <div className="flex gap-2">
                <div className="flex-1">
                  <Input label="ISBN 條碼" name="isbn" value={formData.isbn} onChange={handleChange} placeholder="輸入或掃描" icon={QrCode} />
                </div>
             </div>
             <div className="flex gap-2">
                <Button type="button" variant="secondary" className="flex-1 text-xs" onClick={() => fetchBookInfo()} isLoading={isSearching}>
                  <Search size={14} /> 網路查詢
                </Button>
                <Button type="button" variant="secondary" className="flex-1 text-xs text-[#7a2e2e] dark:text-[#e8dcc7] border-[#c8b89e] dark:border-[#543d2d]" onClick={() => setShowScanner(!showScanner)}>
                  <Camera size={14} /> {showScanner ? '關閉相機' : '掃描條碼'}
                </Button>
             </div>
          </div>
          
          {showScanner && (
            <div className="mt-2">
              <ISBNScanner 
                onScanSuccess={(isbn) => {
                  setFormData(prev => ({...prev, isbn}));
                  setShowScanner(false);
                  fetchBookInfo(isbn);
                }} 
                onClose={() => setShowScanner(false)} 
              />
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input label="書名 *" name="title" value={formData.title} onChange={handleChange} error={errors.title} placeholder="請輸入書名" />
          </div>
          <Input label="作者" name="author" value={formData.author} onChange={handleChange} placeholder="作者名稱" />
          <Input label="購買日期" type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} />
          <Select 
            label="書籍分類 *" 
            name="category" 
            value={formData.category} 
            onChange={handleChange} 
            error={errors.category}
            options={[
              { value: 'tech', label: '資訊技術' },
              { value: 'novel', label: '文學小說' },
              { value: 'comic', label: '漫畫圖文' },
              { value: 'business', label: '商業理財' },
              { value: 'life', label: '生活休閒' },
              { value: 'other', label: '其他' }
            ]}
          />
          <Select 
            label="閱讀狀態" 
            name="status" 
            value={formData.status} 
            onChange={handleChange}
            options={[
              { value: 'unread', label: '未讀 (想看)' },
              { value: 'reading', label: '閱讀中' },
              { value: 'finished', label: '已完讀' },
              { value: 'wishlist', label: '願望清單 (想買)' }
            ]}
          />
          <Input label="存放位置" name="location" value={formData.location} onChange={handleChange} placeholder="例如：書櫃A、Kobo電子書" />
          <Input label="價格" type="number" name="price" value={formData.price} onChange={handleChange} error={errors.price} min="0" placeholder="0" />
          <Input label="總頁數" type="number" name="pageCount" value={formData.pageCount} onChange={handleChange} error={errors.pageCount} min="0" placeholder="0" />
          <div className="md:col-span-2 flex flex-col gap-1 font-serif">
             <label className="text-sm font-bold text-[#5c3a21] dark:text-[#d2c3a5] ml-1">筆記與備註</label>
             <textarea 
               name="notes" 
               value={formData.notes} 
               onChange={handleChange} 
               className="w-full bg-[#fdfbf7] dark:bg-[#1e150e] border border-[#c8b89e] dark:border-[#4a3525] rounded-sm px-4 py-3 text-[#4a2e16] dark:text-[#e8dcc7] focus:outline-none focus:border-[#7a2e2e] dark:focus:border-[#b38b4d] shadow-inner transition-all resize-none h-24 placeholder:text-[#a89078] dark:placeholder:text-[#5c402c]"
               placeholder="寫下你的閱讀心得或購買備註..."
             />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#d2c3a5] dark:border-[#4a3525]">
        <Button type="button" variant="ghost" onClick={onCancel}>取消</Button>
        <Button type="submit" icon={CheckCircle}>歸檔存入</Button>
      </div>
    </form>
  );
};

// 3. Views
const DashboardView = ({ books }) => {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  const stats = useMemo(() => {
    let monthlyAdded = 0;
    let monthlyFinished = 0;
    let monthlySpent = 0;
    let totalSpent = 0;
    let unreadCount = 0;
    let finishedCount = 0;

    books.forEach(b => {
      const bookMonth = b.purchaseDate?.slice(0, 7);
      if (bookMonth === currentMonth) {
        monthlyAdded++;
        monthlySpent += Number(b.price) || 0;
      }
      if (b.status === 'finished' && b.updatedAt?.slice(0, 7) === currentMonth) { // Simplified finish date assumption
         monthlyFinished++;
      }
      totalSpent += Number(b.price) || 0;
      if (b.status === 'unread') unreadCount++;
      if (b.status === 'finished') finishedCount++;
    });

    return {
      monthlyAdded, monthlyFinished, monthlySpent, 
      totalBooks: books.length, totalSpent, unreadCount, 
      finishRate: books.length ? Math.round((finishedCount / books.length) * 100) : 0
    };
  }, [books, currentMonth]);

  // Chart Data preparation
  const categoryData = useMemo(() => {
    const counts = {};
    books.forEach(b => {
      counts[b.category] = (counts[b.category] || 0) + 1;
    });
    const labels = { tech: '資訊技術', novel: '文學小說', comic: '漫畫圖文', business: '商業理財', life: '生活休閒', other: '其他' };
    return Object.entries(counts).map(([name, value]) => ({ name: labels[name] || name, value }));
  }, [books]);

  const COLORS = ['#7a2e2e', '#8b5a2b', '#b38b4d', '#4a5e42', '#3d4c53', '#5c3a21'];

  const StatCard = ({ title, value, subtitle, icon: Icon, colorClass }) => (
    <Card className="p-6 group hover:-translate-y-1 transition-transform duration-300 border-l-[6px] border-l-[#8b5a2b]">
      <div className="flex justify-between items-start font-serif">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold tracking-widest text-[#7a5a41] dark:text-[#a89078]">{title}</span>
          <span className="text-3xl font-bold text-[#4a2e16] dark:text-[#e8dcc7]">{value}</span>
          {subtitle && <span className="text-xs text-[#a89078] dark:text-[#7a5a41]">{subtitle}</span>}
        </div>
        <div className={`p-3 rounded-sm ${colorClass} bg-opacity-10 dark:bg-opacity-20 text-current border border-current/20`}>
          <Icon size={24} className="group-hover:scale-110 transition-transform duration-300" />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in font-serif">
      <h2 className="text-2xl font-bold text-[#4a2e16] dark:text-[#e8dcc7] flex items-center gap-2 border-b border-[#d2c3a5] dark:border-[#4a3525] pb-2">
        <PieChartIcon className="text-[#8b5a2b]" /> 藏書統計
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="本月新增" value={stats.monthlyAdded} subtitle="本月購書數量" icon={BookOpen} colorClass="text-[#4a5e42]" />
        <StatCard title="本月完讀" value={stats.monthlyFinished} subtitle="達成閱讀目標" icon={CheckCircle} colorClass="text-[#b38b4d]" />
        <StatCard title="本月花費" value={`$${stats.monthlySpent.toLocaleString()}`} subtitle="購書總額" icon={DollarSign} colorClass="text-[#7a2e2e]" />
        <StatCard title="總藏書量" value={stats.totalBooks} subtitle="實體與電子書" icon={Library} colorClass="text-[#8b5a2b]" />
        
        <StatCard title="累積花費" value={`$${stats.totalSpent.toLocaleString()}`} icon={TrendingUp} colorClass="text-[#5c3a21]" />
        <StatCard title="山積未讀" value={stats.unreadCount} subtitle="待閱讀書籍" icon={Book} colorClass="text-[#a63c3c]" />
        <StatCard title="完讀率" value={`${stats.finishRate}%`} subtitle="已完讀/總藏書" icon={BarChart3} colorClass="text-[#3d4c53]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        <Card className="p-6 h-80 flex flex-col">
          <h3 className="text-lg font-bold mb-4 text-[#4a2e16] dark:text-[#e8dcc7] font-serif tracking-widest text-center border-b border-dashed border-[#d2c3a5] dark:border-[#543d2d] pb-2">分類佔比</h3>
          {categoryData.length > 0 ? (
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '2px', border: '1px solid #c8b89e', backgroundColor: '#fdfbf7', color: '#4a2e16', fontFamily: 'serif' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#a89078]">尚無足夠資料</div>
          )}
        </Card>
      </div>
    </div>
  );
};

const BookListView = ({ books, onAdd, onEdit, onDelete, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (b.author && b.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (b.isbn && b.isbn.includes(searchTerm));
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchSearch && matchStatus;
    }).sort((a, b) => new Date(b.purchaseDate || b.createdAt) - new Date(a.purchaseDate || a.createdAt));
  }, [books, searchTerm, statusFilter]);

  const statusColors = {
    unread: 'bg-[#b38b4d]', // Gold
    reading: 'bg-[#4a5e42]', // Forest
    finished: 'bg-[#7a2e2e]', // Burgundy
    wishlist: 'bg-[#3d4c53]' // Slate Blue
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in h-full font-serif">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#d2c3a5] dark:border-[#4a3525] pb-4">
        <h2 className="text-2xl font-bold text-[#4a2e16] dark:text-[#e8dcc7] flex items-center gap-2">
          <Library className="text-[#8b5a2b]" /> 典藏書櫃
        </h2>
        <Button onClick={onAdd} icon={Plus}>登錄新書</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-[#fdfbf7] dark:bg-[#2c1f16] p-4 border border-[#d2c3a5] dark:border-[#4a3525] shadow-sm rounded-sm z-20">
        <div className="w-full sm:w-1/2">
           <Input placeholder="搜尋書名、作者、ISBN..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} icon={Search} />
        </div>
        <div className="w-full sm:w-1/4">
          <Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: '所有狀態' },
              { value: 'unread', label: '未讀' },
              { value: 'reading', label: '閱讀中' },
              { value: 'finished', label: '已完讀' },
              { value: 'wishlist', label: '願望清單' }
            ]}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto -mx-2 px-4 pb-12 custom-scrollbar relative">
         <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.08] pointer-events-none mix-blend-multiply dark:mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] z-0"></div>
         
        {isLoading ? (
           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 pt-12 relative z-10">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-44 w-28 mx-auto animate-pulse bg-[#e6d5b8] dark:bg-[#382619] rounded-sm" />
              ))}
           </div>
        ) : filteredBooks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-32 pb-40 pt-12 mt-4 relative z-10">
            {filteredBooks.map(book => (
              <div key={book.id} className="relative flex flex-col items-center group cursor-pointer" onClick={() => onEdit(book)}>
                {/* Shelf Plank */}
                <div className="absolute bottom-0 w-[130%] h-5 bg-gradient-to-b from-[#905e32] to-[#5c3a21] shadow-[0_15px_15px_-3px_rgba(0,0,0,0.6)] border-t border-[#c28c5a] border-b-[3px] border-[#3e2723] z-0 translate-y-full rounded-sm flex justify-between px-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#2a1a11] mt-1 shadow-sm"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-[#2a1a11] mt-1 shadow-sm"></div>
                </div>

                {/* Book Spine / Cover */}
                <div className="z-10 relative w-24 h-36 sm:w-28 sm:h-44 shadow-[8px_0_15px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:-translate-y-4 group-hover:rotate-2 group-hover:shadow-[12px_15px_20px_rgba(0,0,0,0.4)] bg-gradient-to-r from-[#3e2723] to-[#5c3a21] rounded-r-md rounded-l-sm border-l-[3px] border-white/20 flex items-center justify-center overflow-hidden">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="p-1 w-full h-full border border-[#8b5a2b] m-1 rounded-sm flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/leather.png')]"></div>
                      <h4 className="font-serif text-[#f4ebd8] text-[10px] sm:text-xs font-bold tracking-widest line-clamp-4 leading-loose z-10 drop-shadow-md" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>{book.title}</h4>
                    </div>
                  )}
                  {/* Status Bookmark Ribbon */}
                  <div className={`absolute -top-0.5 right-2 w-3.5 h-6 ${statusColors[book.status]} shadow-md border border-black/30 z-20`} style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)' }}></div>
                </div>

                {/* Label hanging below the shelf */}
                <div className="absolute top-[calc(100%+28px)] z-20 w-[95%] bg-[#fdfbf7] dark:bg-[#2c1f16] border border-[#d2c3a5] dark:border-[#543d2d] p-1.5 text-center shadow-lg flex flex-col items-center gap-0.5 group-hover:bg-[#fff] dark:group-hover:bg-[#382619] transition-colors rounded-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3e2723] absolute -top-1 shadow-inner border border-[#1a120c]"></div>
                    <h3 className="font-serif font-bold text-[#4a2e16] dark:text-[#d2c3a5] text-[11px] line-clamp-1 w-full mt-0.5" title={book.title}>{book.title}</h3>
                    <p className="text-[9px] text-[#7a5a41] dark:text-[#a89078] truncate w-full">{book.author || '未知作者'}</p>
                    
                    {/* Action button on hover */}
                    <div className="absolute -bottom-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button onClick={(e) => { e.stopPropagation(); onDelete(book); }} className="p-1.5 bg-[#a63c3c] text-[#f4ebd8] rounded-full shadow-md border border-[#5e2323] hover:bg-[#7a2e2e]"><Trash2 size={12}/></button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-[#a89078] gap-4 relative z-10">
            <Book size={48} className="opacity-50" />
            <p className="font-serif tracking-widest">書架空空如也</p>
          </div>
        )}
      </div>
    </div>
  );
};


// --- Main Application ---
export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Local App Password state
  const [passwordInput, setPasswordInput] = useState('');
  
  const [books, setBooks] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  
  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Initialize Auth & Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    const checkLocalAuth = () => {
      const stored = localStorage.getItem('app_auth');
      if (stored === 'true') setIsLoggedIn(true);
    };
    checkLocalAuth();

    const initFirebase = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
           await signInWithCustomToken(auth, __initial_auth_token);
        } else {
           await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Firebase Auth Error:", err);
      }
    };
    initFirebase();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Data
  useEffect(() => {
    if (!user || !isLoggedIn) return;
    
    setIsDataLoading(true);
    const booksRef = collection(db, getCollectionPath(user.uid, 'books'));
    
    const unsubscribeBooks = onSnapshot(booksRef, (snapshot) => {
      const booksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBooks(booksData);
      setIsDataLoading(false);
    }, (error) => {
      console.error("Fetch books error:", error);
      setIsDataLoading(false);
    });

    return () => {
      unsubscribeBooks();
    };
  }, [user, isLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === '1234') {
      localStorage.setItem('app_auth', 'true');
      setIsLoggedIn(true);
    } else {
      alert("密碼錯誤");
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleLogout = () => {
    localStorage.removeItem('app_auth');
    setIsLoggedIn(false);
  };

  // CRUD Operations
  const handleSaveBook = async (bookData) => {
    if (!user) return;
    try {
      if (editingBook) {
        // Update
        const bookRef = doc(db, getCollectionPath(user.uid, 'books'), editingBook.id);
        await updateDoc(bookRef, bookData);
      } else {
        // Create
        // Duplicate check
        const isDuplicate = books.some(b => 
          (bookData.isbn && b.isbn === bookData.isbn) || 
          (b.title.toLowerCase() === bookData.title.toLowerCase())
        );
        if (isDuplicate) {
           if (!window.confirm("警告：似乎已有相同 ISBN 或書名的書籍，確定要新增嗎？")) return;
        }
        
        const booksCol = collection(db, getCollectionPath(user.uid, 'books'));
        await addDoc(booksCol, bookData);
      }
      setIsBookModalOpen(false);
      setEditingBook(null);
    } catch (err) {
      console.error("Save error:", err);
      alert("儲存失敗");
    }
  };

  const handleDeleteBook = async () => {
    if (!user || !deleteConfirm) return;
    try {
      await deleteDoc(doc(db, getCollectionPath(user.uid, 'books'), deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  // --- Initial Loading Screen ---
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#1a120c] flex flex-col items-center justify-center text-[#e8dcc7] font-serif">
        <Library size={64} className="text-[#8b5a2b] animate-pulse mb-4 drop-shadow-[0_0_15px_rgba(139,90,43,0.5)]" />
        <h1 className="text-2xl font-bold tracking-[0.2em]">書櫃載入中...</h1>
        <div className="mt-8 w-48 h-1 bg-[#2c1f16] rounded-full overflow-hidden border border-[#382619]">
           <div className="w-full h-full bg-gradient-to-r from-[#8b5a2b] to-[#5c3a21] animate-progress"></div>
        </div>
      </div>
    );
  }

  // --- Login Screen ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 relative font-serif" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-1.2.1&auto=format&fit=crop&w=2000&q=80)' }}>
        <div className="absolute inset-0 bg-[#1a120c]/80 backdrop-blur-sm mix-blend-multiply"></div>
        <Card className="w-full max-w-md p-8 relative z-10 border-2 border-[#8b5a2b]/50 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col items-center text-center mb-8">
             <div className="w-16 h-16 bg-gradient-to-br from-[#8b5a2b] to-[#5c3a21] rounded-full flex items-center justify-center shadow-lg shadow-[#8b5a2b]/30 mb-4 border border-[#c28c5a]">
                <Library size={32} className="text-[#f4ebd8]" />
             </div>
             <h1 className="text-3xl font-bold text-[#4a2e16] dark:text-[#e8dcc7] tracking-widest border-b-2 border-[#d2c3a5] dark:border-[#543d2d] pb-2">私人書櫃</h1>
             <p className="text-[#7a5a41] dark:text-[#a89078] mt-4 font-semibold tracking-wide">請輸入密碼以解鎖書房</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <Input 
              type="password" 
              placeholder="預設密碼: 1234" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              autoFocus
            />
            <Button type="submit" className="w-full mt-2 py-3 text-lg">進入書房</Button>
          </form>
        </Card>
      </div>
    );
  }

  // --- Main App Shell ---
  const navItems = [
    { id: 'dashboard', label: '藏書統計', icon: PieChartIcon },
    { id: 'books', label: '典藏書櫃', icon: Library },
    { id: 'settings', label: '系統設定', icon: SettingsIcon },
  ];

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f4ebd8] dark:bg-[#1a120c] text-[#4a2e16] dark:text-[#d2c3a5] font-serif transition-colors duration-300 flex overflow-hidden selection:bg-[#8b5a2b]/30 relative">
        {/* Background Texture/Vignette */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
           <div className="absolute inset-0 opacity-[0.03] dark:opacity-10 mix-blend-multiply dark:mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(62,39,35,0.1)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.7)_100%)]"></div>
        </div>

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#e6d5b8] dark:bg-[#2c1f16] shadow-[4px_0_15px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_20px_rgba(0,0,0,0.5)] border-r-2 border-[#d2c3a5] dark:border-[#1e150e] transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col relative`}>
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
          
          <div className="p-6 flex items-center gap-3 relative z-10 border-b border-[#d2c3a5] dark:border-[#4a3525]">
             <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-[#8b5a2b] to-[#5c3a21] flex items-center justify-center shadow-md border border-[#c28c5a]">
                <BookOpen size={20} className="text-[#f4ebd8]" />
             </div>
             <span className="text-xl font-bold text-[#4a2e16] dark:text-[#e8dcc7] tracking-widest">藏書閣</span>
          </div>

          <nav className="flex-1 px-4 py-6 flex flex-col gap-3 relative z-10">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-sm font-bold tracking-widest transition-all ${
                  activeTab === item.id 
                  ? 'bg-[#7a2e2e] text-[#f4ebd8] shadow-md border border-[#5e2323]' 
                  : 'text-[#7a5a41] dark:text-[#a89078] hover:bg-[#d2c3a5]/40 dark:hover:bg-[#4a3525]/50 border border-transparent'
                }`}
              >
                <item.icon size={20} /> {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-[#d2c3a5] dark:border-[#4a3525] relative z-10">
            <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 rounded-sm font-bold tracking-widest text-[#a63c3c] hover:bg-[#a63c3c]/10 transition-colors border border-transparent hover:border-[#a63c3c]/20">
              <LogOut size={20} /> 鎖上書房
            </button>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-[#1a120c]/60 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 md:ml-64 relative z-10 h-screen overflow-hidden">
          {/* Topbar */}
          <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-[#d2c3a5] dark:border-[#4a3525] bg-[#fdfbf7]/80 dark:bg-[#1a120c]/80 backdrop-blur-md sticky top-0 z-20">
             <button className="p-2 -ml-2 rounded-sm text-[#7a5a41] hover:bg-[#e6d5b8] dark:hover:bg-[#2c1f16] md:hidden" onClick={() => setIsSidebarOpen(true)}>
               <Menu size={24} />
             </button>
             
             <div className="flex-1" />
             
             <button onClick={toggleTheme} className="p-2 rounded-full text-[#8b5a2b] dark:text-[#d2c3a5] hover:bg-[#e6d5b8] dark:hover:bg-[#2c1f16] transition-colors border border-transparent hover:border-[#d2c3a5] dark:hover:border-[#4a3525]" title="切換日夜">
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
             </button>
          </header>

          {/* Content Scroll Area */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 custom-scrollbar relative">
             <div className="max-w-7xl mx-auto h-full relative z-10">
                {activeTab === 'dashboard' && <DashboardView books={books} />}
                
                {activeTab === 'books' && (
                  <BookListView 
                    books={books} 
                    isLoading={isDataLoading}
                    onAdd={() => { setEditingBook(null); setIsBookModalOpen(true); }}
                    onEdit={(book) => { setEditingBook(book); setIsBookModalOpen(true); }}
                    onDelete={(book) => setDeleteConfirm(book)}
                  />
                )}
                
                {activeTab === 'settings' && (
                  <div className="animate-fade-in max-w-2xl mx-auto font-serif">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-[#4a2e16] dark:text-[#e8dcc7] border-b border-[#d2c3a5] dark:border-[#4a3525] pb-2">
                      <SettingsIcon className="text-[#8b5a2b]"/> 系統設定
                    </h2>
                    <Card className="p-6 flex flex-col gap-6">
                       <div>
                         <h3 className="text-lg font-bold mb-2 text-[#5c3a21] dark:text-[#d2c3a5]">解鎖密碼</h3>
                         <p className="text-sm text-[#7a5a41] dark:text-[#a89078] mb-4">目前受限於環境，密碼固定為 1234。若需修改需串接完整 Authentication 流程。</p>
                         <Input type="password" value="1234" disabled label="目前密碼" />
                       </div>
                       <hr className="border-[#d2c3a5] dark:border-[#4a3525]" />
                       <div>
                          <h3 className="text-lg font-bold mb-2 text-[#5c3a21] dark:text-[#d2c3a5]">資料庫連線狀態</h3>
                          <div className="flex items-center gap-2 text-[#4a5e42] bg-[#4a5e42]/10 border border-[#4a5e42]/30 px-4 py-2 rounded-sm inline-flex font-bold tracking-wide">
                            <CheckCircle size={18} /> 已連線至 Firebase ({appId})
                          </div>
                       </div>
                    </Card>
                  </div>
                )}
             </div>
          </div>
        </main>

        {/* Modals */}
        <Modal 
          isOpen={isBookModalOpen} 
          onClose={() => setIsBookModalOpen(false)} 
          title={editingBook ? "編輯藏書" : "登錄新書"}
          maxWidth="max-w-4xl"
        >
          <BookForm 
            userId={user?.uid}
            initialData={editingBook} 
            onSave={handleSaveBook} 
            onCancel={() => setIsBookModalOpen(false)} 
          />
        </Modal>

        <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="銷毀藏書">
           <div className="flex flex-col items-center gap-4 py-4 text-center font-serif">
             <div className="w-16 h-16 rounded-full bg-[#a63c3c]/10 border border-[#a63c3c]/30 flex items-center justify-center text-[#a63c3c]">
               <AlertCircle size={32} />
             </div>
             <div>
               <h4 className="text-xl font-bold text-[#4a2e16] dark:text-[#e8dcc7]">確定要銷毀這本藏書嗎？</h4>
               <p className="text-[#7a5a41] dark:text-[#a89078] mt-3">
                 即將銷毀：<br/><span className="font-bold text-lg text-[#5c3a21] dark:text-[#d2c3a5] block mt-1">{deleteConfirm?.title}</span>
               </p>
               <p className="text-sm text-[#a63c3c] mt-4 font-bold tracking-wider">※ 此操作無法復原，典籍將永久消失。</p>
             </div>
             <div className="flex gap-3 w-full mt-6">
                <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(null)}>取消</Button>
                <Button variant="danger" className="flex-1" onClick={handleDeleteBook}>確定銷毀</Button>
             </div>
           </div>
        </Modal>
        
      </div>
      
      {/* Global Styles for Animations and Scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(139, 90, 43, 0.4); border-radius: 4px; border: 1px solid rgba(139,90,43,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(139, 90, 43, 0.7); }
        
        @keyframes progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-progress { animation: progress 2s infinite linear; }
        
        @keyframes scan-line { 0% { top: 10%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 90%; opacity: 0; } }
        .animate-scan-line { animation: scan-line 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}} />
    </ToastProvider>
  );
}
