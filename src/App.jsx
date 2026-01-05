import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, query, where, getDocs, 
  addDoc, updateDoc, doc, getDoc, setDoc, deleteDoc, 
  serverTimestamp, Timestamp, onSnapshot 
} from 'firebase/firestore';
import { 
  User, Lock, Shield, School, Plus, RefreshCw, 
  Copy, Clock, CheckCircle, XCircle, AlertCircle, 
  Edit, Save, ChevronRight, Check, Trash2, 
  Briefcase, GraduationCap, Users, UserCheck
} from 'lucide-react';

// --- Firebase 初始化 ---
const firebaseConfig = {
  apiKey: "AIzaSyC9Yav-daO7LpkIsdTm-7DzItVK2DXyK8M",
  authDomain: "aihealthlearn.firebaseapp.com",
  projectId: "aihealthlearn",
  storageBucket: "aihealthlearn.firebasestorage.app",
  messagingSenderId: "374295973154",
  appId: "1:374295973154:web:5e8dcd5b45994f64b1a97b",
  measurementId: "G-J8TCPYV4W3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = "school-system-v1"; 

const CODES_COLLECTION = 'verification_codes';
const USERS_COLLECTION = 'users';

const DISCORD_WEBHOOK_URL = "https://discordapp.com/api/webhooks/1456473083664662548/X1cCwWChlZnyRooExH8JeT1mrtiRtjHgptnnz-am7jR5Sawg22MrlGM50xBYCXGOkSb9";

// --- 工具函數 ---
const formatDate = (timestamp) => {
  if (!timestamp) return '無';
  return new Date(timestamp.seconds * 1000).toLocaleString('zh-TW');
};

const copyToClipboard = (text) => {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  const success = document.execCommand('copy');
  document.body.removeChild(el);
  return success;
};

const sendToDiscord = async (message) => {
  if (!DISCORD_WEBHOOK_URL) return;
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });
  } catch (error) {
    console.error("Discord Webhook Error:", error);
  }
};

// --- 主要組件 ---
export default function App() {
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('autoLoginUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('autoLoginUser');
    setUser(null);
  };

  if (!user) {
    return <LoginPage setUser={setUser} setLoading={setLoading} loading={loading} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-blue-500 selection:text-white">
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-500" />
              <span className="font-bold text-xl tracking-wider">System Admin</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                身份: <span className={`font-bold ${user.role === 'engineer' ? 'text-purple-400' : user.role === 'teacher' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {user.role === 'engineer' ? '工程師' : user.role === 'teacher' ? '教師' : '業務'}
                </span>
                {user.username && ` | ${user.username}`}
              </span>
              <button 
                onClick={handleLogout}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {user.role === 'engineer' && <EngineerDashboard user={user} />}
        {user.role === 'sales' && <SalesDashboard user={user} />}
        {user.role === 'teacher' && <TeacherDashboard user={user} setUser={setUser} />}
      </main>
    </div>
  );
}

// --- 登入頁面 ---
function LoginPage({ setUser, setLoading, loading }) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [autoLogin, setAutoLogin] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (account === 'isynreal' && password === '54279327') {
        const engUser = { role: 'engineer', username: 'isynreal', realName: '工程師', uid: 'engineer-master' };
        finalizeLogin(engUser);
        sendToDiscord(`[Web後台] 工程師 isynreal 已登入`);
        return;
      }

      const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION), 
        where('username', '==', account),
        where('password', '==', password)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        const uid = snapshot.docs[0].id;
        
        if (userData.role === 'engineer') {
            setError('權限錯誤');
            setLoading(false);
            return;
        }

        const loginUser = { 
          role: userData.role, 
          username: userData.username, 
          uid: uid,
          ...userData 
        };
        finalizeLogin(loginUser);
        sendToDiscord(`[Web後台] ${userData.role === 'teacher' ? '教師' : '業務'} ${userData.realName || userData.username} 已登入`);
      } else {
        setError('帳號或密碼錯誤');
        setLoading(false);
      }

    } catch (err) {
      console.error(err);
      setError('登入發生錯誤: ' + err.message);
      setLoading(false);
    }
  };

  const finalizeLogin = (userData) => {
    if (autoLogin) {
      localStorage.setItem('autoLoginUser', JSON.stringify(userData));
    }
    setUser(userData);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-800">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">後台系統登入</h2>
          <p className="text-gray-400">請輸入您的憑證以繼續</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">帳號</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input 
                type="text" 
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="輸入帳號"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">密碼</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="輸入密碼"
                required
              />
            </div>
          </div>

          <div className="flex items-center">
            <input 
              id="auto-login" 
              type="checkbox"
              checked={autoLogin}
              onChange={(e) => setAutoLogin(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-700 rounded bg-gray-800"
            />
            <label htmlFor="auto-login" className="ml-2 block text-sm text-gray-400">
              自動登入
            </label>
          </div>

          {error && <div className="text-red-500 text-sm text-center bg-red-900/20 py-2 rounded border border-red-900">{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            // 修正: 將 bg-gradient-to-r 更新為 bg-linear-to-r 以符合 Tailwind v4 標準
            className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? '驗證中...' : '登入系統'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- 工程師面板 ---
function EngineerDashboard({ user }) {
  const [newAccount, setNewAccount] = useState({ username: '', password: '', role: 'sales', name: '' });
  const [msg, setMsg] = useState('');

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION), {
        username: newAccount.username,
        password: newAccount.password,
        role: newAccount.role,
        realName: newAccount.name, 
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      const info = `[Web後台] 工程師建立了 ${newAccount.role === 'sales' ? '業務' : '教師'} 帳號: ${newAccount.username} (${newAccount.name})`;
      setMsg(info);
      sendToDiscord(info);
      setNewAccount({ username: '', password: '', role: 'sales', name: '' });
    } catch (err) {
      setMsg('建立失敗: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
           <Shield className="w-5 h-5" /> 建立新帳號
        </h3>
        <form onSubmit={handleCreateAccount} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            placeholder="帳號" 
            value={newAccount.username}
            onChange={e => setNewAccount({...newAccount, username: e.target.value})}
            className="bg-gray-700 border border-gray-600 rounded p-2 text-white" required
          />
          <input 
            placeholder="密碼" 
            value={newAccount.password}
            onChange={e => setNewAccount({...newAccount, password: e.target.value})}
            className="bg-gray-700 border border-gray-600 rounded p-2 text-white" required
          />
           <input 
            placeholder="顯示名稱 (如: 王大明)" 
            value={newAccount.name}
            onChange={e => setNewAccount({...newAccount, name: e.target.value})}
            className="bg-gray-700 border border-gray-600 rounded p-2 text-white" required
          />
          <select 
            value={newAccount.role}
            onChange={e => setNewAccount({...newAccount, role: e.target.value})}
            className="bg-gray-700 border border-gray-600 rounded p-2 text-white"
          >
            <option value="sales">業務人員</option>
            <option value="teacher">教師</option>
          </select>
          <button type="submit" className="md:col-span-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded transition">
            建立帳號
          </button>
        </form>
        {msg && <p className="mt-4 text-green-400">{msg}</p>}
      </div>

      <EngineerHierarchy />

      <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
         <h3 className="text-xl font-bold mb-4 text-gray-300">所有驗證碼列表 (扁平視圖)</h3>
         <CodeList filterRole={null} currentUid={null} isEngineer={true} currentUser={user} />
      </div>
    </div>
  );
}

// --- 工程師階層視圖 (包含刪除帳號功能) ---
function EngineerHierarchy() {
  const [users, setUsers] = useState([]);
  const [codes, setCodes] = useState([]);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(list);
    });
    const unsubCodes = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', CODES_COLLECTION), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCodes(list);
    });
    return () => {
      unsubUsers();
      unsubCodes();
    };
  }, []);

  const handleDeleteUser = async (uid, name, role) => {
    if (!confirm(`警告：您確定要刪除 ${role} "${name}" 的帳號嗎？\n\n此操作無法復原，且該帳號將無法再登入。`)) return;
    
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION, uid));
        sendToDiscord(`[Web後台] 工程師已刪除 ${role} 帳號: ${name} (UID: ${uid})`);
        alert('刪除成功');
    } catch (e) {
        alert('刪除失敗: ' + e.message);
    }
  };

  const salesPeople = users.filter(u => u.role === 'sales');

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
      <h3 className="text-xl font-bold mb-4 text-purple-400 flex items-center gap-2">
        <Users className="w-5 h-5" /> 系統全域階層視圖 (業務 {'->'} 教師 {'->'} 學生)
      </h3>
      <div className="space-y-4">
        {salesPeople.map(sale => {
          const teacherCodes = codes.filter(c => c.createdByUid === sale.id && c.type === 'teacher');
          
          return (
            <div key={sale.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-lg text-yellow-400">{sale.realName || sale.username} (業務)</span>
                <span className="text-xs text-gray-500 ml-2">UID: {sale.id}</span>
                <button 
                    onClick={() => handleDeleteUser(sale.id, sale.realName || sale.username, '業務')}
                    className="ml-auto text-red-500 hover:text-red-400 p-1 hover:bg-gray-800 rounded"
                    title="刪除業務帳號"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {teacherCodes.length === 0 ? (
                 <p className="text-gray-500 text-sm pl-8">尚未建立教師驗證碼</p>
              ) : (
                <div className="pl-6 space-y-4 border-l-2 border-gray-700 ml-2">
                  {teacherCodes.map(tCode => {
                    const teacher = users.find(u => u.id === tCode.usedByUid);
                    const studentCodes = teacher ? codes.filter(c => c.createdByUid === teacher.id && c.type === 'student') : [];

                    return (
                      <div key={tCode.id} className="relative">
                        <div className="flex items-center gap-2 mb-2">
                          <GraduationCap className="w-4 h-4 text-green-400" />
                          <span className="text-gray-300 font-mono text-sm">{tCode.code}</span>
                          <span className="text-gray-500">→</span>
                          {teacher ? (
                            <>
                                <span className="font-bold text-green-400">{teacher.realName || teacher.username} (教師)</span>
                                <button 
                                    onClick={() => handleDeleteUser(teacher.id, teacher.realName || teacher.username, '教師')}
                                    className="ml-2 text-red-500 hover:text-red-400 p-1 hover:bg-gray-800 rounded"
                                    title="刪除教師帳號"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </>
                          ) : (
                            <span className="text-gray-500 italic">尚未綁定/使用</span>
                          )}
                        </div>

                        {teacher && (
                          <div className="pl-6 space-y-2 border-l-2 border-gray-800 ml-2 pb-2">
                             {studentCodes.length === 0 ? (
                               <p className="text-gray-600 text-xs">無學生</p>
                             ) : (
                               studentCodes.map(sCode => {
                                 const student = users.find(u => u.id === sCode.usedByUid);
                                 return (
                                   <div key={sCode.id} className="flex items-center gap-2 text-xs">
                                     <UserCheck className="w-3 h-3 text-blue-400" />
                                     <span className="text-gray-400 font-mono">{sCode.code}</span>
                                     <span className="text-gray-600">→</span>
                                     {student ? (
                                       <>
                                         <span className="text-blue-300">{student.realName} (學生)</span>
                                         <button 
                                            onClick={() => handleDeleteUser(student.id, student.realName || student.username, '學生')}
                                            className="ml-2 text-red-500 hover:text-red-400 p-1 hover:bg-gray-800 rounded"
                                            title="刪除學生帳號"
                                         >
                                            <Trash2 className="w-3 h-3" />
                                         </button>
                                       </>
                                     ) : (
                                       <span className="text-gray-600">未使用</span>
                                     )}
                                   </div>
                                 );
                               })
                             )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {salesPeople.length === 0 && <p className="text-gray-500">暫無業務人員</p>}
      </div>
    </div>
  );
}

// --- 業務面板 ---
function SalesDashboard({ user }) {
  return (
    <div className="space-y-6">
      <CodeGenerator user={user} targetRole="teacher" title="建立教師驗證碼" />
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
         <h3 className="text-xl font-bold mb-4 text-yellow-400">已建立的驗證碼</h3>
         <CodeList filterRole="teacher" currentUid={user.uid} currentUser={user} />
      </div>
    </div>
  );
}

// --- 教師面板 ---
function TeacherDashboard({ user, setUser }) {
  const isProfileIncomplete = !user.school || !user.className || !user.subject || !user.realName;
  const [profileData, setProfileData] = useState({
    school: user.school || '',
    className: user.className || '',
    subject: user.subject || '',
    realName: user.realName || ''
  });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION, user.uid), {
        school: profileData.school,
        className: profileData.className,
        subject: profileData.subject,
        realName: profileData.realName
      });
      setUser({ ...user, ...profileData }); 
      sendToDiscord(`[Web後台] 教師 ${profileData.realName} 已完善個人資料`);
    } catch (err) {
      alert('更新失敗: ' + err.message);
    }
  };

  if (isProfileIncomplete) {
    return (
      <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl">
        <h2 className="text-2xl font-bold text-green-400 mb-6 flex items-center gap-2">
          <Edit className="w-6 h-6" /> 完善教師資料
        </h2>
        <p className="text-gray-400 mb-6">初次登入，請填寫您的任教資訊。</p>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">任職學校</label>
            <input 
              value={profileData.school} onChange={e=>setProfileData({...profileData, school: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 p-2 rounded text-white" required 
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">班級</label>
            <input 
              value={profileData.className} onChange={e=>setProfileData({...profileData, className: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 p-2 rounded text-white" required 
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">授課內容</label>
            <input 
              value={profileData.subject} onChange={e=>setProfileData({...profileData, subject: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 p-2 rounded text-white" required 
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">真實姓名</label>
            <input 
              value={profileData.realName} onChange={e=>setProfileData({...profileData, realName: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 p-2 rounded text-white" required 
            />
          </div>
          <button type="submit" className="w-full bg-green-600 hover:bg-green-500 py-2 rounded text-white font-bold">
            保存資料並進入
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-4 rounded-lg flex gap-4 text-sm text-gray-400 border border-gray-700">
        <div>學校: <span className="text-white">{user.school}</span></div>
        <div>班級: <span className="text-white">{user.className}</span></div>
        <div>科目: <span className="text-white">{user.subject}</span></div>
        <div>姓名: <span className="text-white">{user.realName}</span></div>
      </div>

      <CodeGenerator user={user} targetRole="student" title="建立學生驗證碼" />

      <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
         <h3 className="text-xl font-bold mb-4 text-green-400">學生驗證碼與資料管理</h3>
         <CodeList filterRole="student" currentUid={user.uid} showStudentDetail={true} currentUser={user} />
      </div>
    </div>
  );
}

// --- 通用組件: 驗證碼生成器 ---
function CodeGenerator({ user, targetRole, title }) {
  const [duration, setDuration] = useState(30); 
  const [loading, setLoading] = useState(false);

  const generateCode = async () => {
    setLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(now.getDate() + parseInt(duration));

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', CODES_COLLECTION), {
        code: code,
        type: targetRole,
        createdByUid: user.uid,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        isUsed: false,
        boundMac: '',
        usedByUid: '',
        durationDays: parseInt(duration)
      });
      
      sendToDiscord(`[Web後台] ${user.role === 'teacher' ? '教師' : '業務'} ${user.realName || user.username} 建立了 ${targetRole === 'student' ? '學生' : '教師'} 驗證碼: ${code}`);
      setLoading(false);
    } catch (err) {
      alert('生成錯誤: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 flex items-end gap-4">
      <div className="flex-1">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <label className="block text-sm text-gray-400 mb-1">授權時間 (天)</label>
        <input 
          type="number" 
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded p-2 text-white w-full"
        />
      </div>
      <button 
        onClick={generateCode} 
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded h-10 mb-0.5 disabled:opacity-50"
      >
        {loading ? '生成中...' : '建立驗證碼'}
      </button>
    </div>
  );
}

// --- 通用組件: 驗證碼列表 ---
function CodeList({ filterRole, currentUid, isEngineer, showStudentDetail, currentUser }) {
  const [codes, setCodes] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    let q;
    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', CODES_COLLECTION);
    
    if (isEngineer) {
      q = query(collectionRef);
    } else {
      q = query(collectionRef, where('createdByUid', '==', currentUid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setCodes(list);
    }, (error) => {
      console.error("Error fetching codes:", error);
    });

    return () => unsubscribe();
  }, [currentUid, isEngineer]);

  const extendTime = async (codeId, currentExpire) => {
    const days = prompt('延長多少天?', '30');
    if (!days) return;
    
    const oldDate = new Date(currentExpire.seconds * 1000);
    oldDate.setDate(oldDate.getDate() + parseInt(days));
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', CODES_COLLECTION, codeId), {
      expiresAt: Timestamp.fromDate(oldDate)
    });
  };

  const deleteCode = async (code, codeId, usedByUid) => {
    if (!confirm(`確定要刪除驗證碼 ${code} 嗎？刪除後將無法使用。`)) return;
    
    let teacherName = "";
    
    if (usedByUid) {
      try {
        const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION, usedByUid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          teacherName = userData.realName || userData.username;
        }
      } catch (e) {
        console.error("Error fetching user name for delete message", e);
      }
    }

    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', CODES_COLLECTION, codeId));
        
        const salesName = currentUser ? (currentUser.realName || currentUser.username) : "Unknown";
        let msg = `[Web後台] "${salesName}" 已將驗證碼 ${code} 刪除`;
        
        if (teacherName) {
           msg = `[Web後台] "${salesName}" 已將 "${teacherName}" 驗證碼 ${code} 刪除`;
        }

        sendToDiscord(msg);
    } catch(e) {
        alert("刪除失敗: " + e.message);
    }
  };

  const handleCopy = (text, id) => {
    copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      {codes.map(item => {
        const isExpired = item.expiresAt?.seconds * 1000 < Date.now();
        const borderColor = isExpired ? 'border-red-500' : (item.isUsed ? 'border-green-500' : 'border-gray-500');

        return (
          <div key={item.id} className={`relative bg-gray-800 border-2 ${borderColor} rounded-lg p-4 transition-all hover:shadow-lg`}>
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono font-bold text-white tracking-widest">{item.code}</span>
                  
                  <button 
                    onClick={() => handleCopy(item.code, item.id)} 
                    className="flex items-center gap-1 p-1 hover:bg-gray-700 rounded text-gray-400 transition-colors"
                    title="複製驗證碼"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-500 font-bold">已複製</span>
                      </>
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <span className={`text-xs px-2 py-0.5 rounded ${isExpired ? 'bg-red-600' : (item.isUsed ? 'bg-green-600' : 'bg-gray-600')}`}>
                    {isExpired ? '已到期' : (item.isUsed ? '已啟用' : '未啟用')}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400">
                  <div>
                    <span className="block text-xs text-gray-500">綁定 MAC</span>
                    <span className="block break-all">{item.boundMac || '尚未綁定'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">建立日期</span>
                    {formatDate(item.createdAt)}
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">到期日期</span>
                    <span className={isExpired ? 'text-red-400 font-bold' : ''}>{formatDate(item.expiresAt)}</span>
                  </div>

                  {!showStudentDetail && item.type === 'teacher' && item.isUsed && (
                    <div className="col-span-2 md:col-span-1">
                       <span className="block text-xs text-gray-500">使用教師</span>
                       <UserNameDisplay uid={item.usedByUid} placeholder="尚未輸入" />
                    </div>
                  )}

                  {showStudentDetail && item.isUsed && (
                    <StudentDetailDisplay uid={item.usedByUid} />
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-center gap-2 border-l border-gray-700 pl-4">
                <button 
                  onClick={() => extendTime(item.id, item.expiresAt)}
                  className="flex items-center gap-1 bg-blue-600/80 hover:bg-blue-600 text-xs px-3 py-2 rounded text-white w-full justify-center"
                >
                  <Clock className="w-3 h-3" /> 延長時間
                </button>
                <button 
                  onClick={() => deleteCode(item.code, item.id, item.usedByUid)}
                  className="flex items-center gap-1 bg-red-600/80 hover:bg-red-600 text-xs px-3 py-2 rounded text-white w-full justify-center"
                >
                  <Trash2 className="w-3 h-3" /> 刪除代碼
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {codes.length === 0 && <p className="text-gray-500 text-center py-8">暫無資料</p>}
    </div>
  );
}

// --- 用戶名稱顯示元件 ---
function UserNameDisplay({ uid, placeholder }) {
  const [name, setName] = useState('...');
  useEffect(() => {
    if (!uid) {
        setName(placeholder);
        return;
    }
    getDoc(doc(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION, uid)).then(snap => {
        if (snap.exists()) {
            const data = snap.data();
            setName(data.realName || data.username || placeholder);
        } else {
            setName(placeholder);
        }
    });
  }, [uid, placeholder]);

  return <span className="font-bold text-yellow-300">{name}</span>;
}

// --- 學生資料顯示元件 ---
function StudentDetailDisplay({ uid }) {
  const [student, setStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const fetchUser = async () => {
    if (!uid) return;
    setRefreshing(true);
    const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION, uid));
    if (docSnap.exists()) {
      setStudent({ id: docSnap.id, ...docSnap.data() });
      setEditData(docSnap.data());
    }
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUser();
  }, [uid]);

  const handleSave = async () => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION, uid), {
        realName: editData.realName,
        email: editData.email,
        username: editData.username,
        password: editData.password
    });
    setStudent({...student, ...editData});
    setIsEditing(false);
    sendToDiscord(`[Web後台] 學生資料已更新: ${editData.realName} (${editData.username})`);
  };

  if (!student) return <div className="text-xs text-gray-500">載入學生資料...</div>;

  if (isEditing) {
    return (
      <div className="col-span-2 bg-gray-900 p-2 rounded border border-gray-600 space-y-2">
        <input value={editData.realName} onChange={e=>setEditData({...editData, realName:e.target.value})} className="w-full bg-gray-800 text-xs p-1 rounded border border-gray-700" placeholder="姓名" />
        <input value={editData.email} onChange={e=>setEditData({...editData, email:e.target.value})} className="w-full bg-gray-800 text-xs p-1 rounded border border-gray-700" placeholder="Email" />
        <input value={editData.username} onChange={e=>setEditData({...editData, username:e.target.value})} className="w-full bg-gray-800 text-xs p-1 rounded border border-gray-700" placeholder="帳號" />
        <input value={editData.password} onChange={e=>setEditData({...editData, password:e.target.value})} className="w-full bg-gray-800 text-xs p-1 rounded border border-gray-700" placeholder="密碼" />
         <div className="flex gap-2">
            <button onClick={handleSave} className="bg-green-600 text-xs px-2 py-1 rounded text-white">保存</button>
            <button onClick={()=>setIsEditing(false)} className="bg-gray-600 text-xs px-2 py-1 rounded text-white">取消</button>
         </div>
      </div>
    );
  }

  return (
    <div className="col-span-2 text-xs bg-gray-700/50 p-2 rounded relative group">
      <div className="flex justify-between items-start">
         <div>
            <div className="text-blue-300 font-bold text-sm mb-1">{student.realName}</div>
            <div className="text-gray-400">信箱: <span className="text-gray-300">{student.email || '無'}</span></div>
            <div className="text-gray-400">帳號: <span className="text-gray-300">{student.username}</span></div>
            <div className="text-gray-400">密碼: <span className="text-gray-300">{student.password}</span></div>
         </div>
         <div className="flex flex-col gap-2">
            <button onClick={()=>setIsEditing(true)} className="text-gray-400 hover:text-white" title="編輯">
                <Edit className="w-3 h-3"/>
            </button>
            <button onClick={fetchUser} className={`text-gray-400 hover:text-blue-400 ${refreshing ? 'animate-spin' : ''}`} title="刷新資料">
                <RefreshCw className="w-3 h-3"/>
            </button>
         </div>
      </div>
    </div>
  );
}