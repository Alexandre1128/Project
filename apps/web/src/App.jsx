import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const api = axios.create({ baseURL: 'http://localhost:4000' });

export function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tips, setTips] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ success_rate: 0 });
  const [profile, setProfile] = useState(null);
  const [title, setTitle] = useState('');

  const authHeaders = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}`, 'x-device-id': 'web-browser-main' }
  }), [token]);

  const loadPrivateArea = async () => {
    if (!token) return;
    const [weekly, oldTips, statData, profileData] = await Promise.all([
      api.get('/tips/week', authHeaders),
      api.get('/tips/history', authHeaders),
      api.get('/tips/stats', authHeaders),
      api.get('/user/profile', authHeaders)
    ]);
    setTips(weekly.data);
    setHistory(oldTips.data);
    setStats(statData.data);
    setProfile(profileData.data);
  };

  useEffect(() => {
    loadPrivateArea();
  }, [token]);

  const login = async () => {
    const response = await api.post('/auth/login', { email, password });
    setToken(response.data.token);
    localStorage.setItem('token', response.data.token);
  };

  const register = async () => {
    await api.post('/auth/register', { name, email, password });
    await login();
  };

  const createTip = async () => {
    await api.post('/admin/tips', {
      title,
      competition: 'Liga Portugal',
      matchDate: new Date().toISOString(),
      prediction: 'Equipa da casa vence',
      confidence: 75,
      odds: 1.85
    }, authHeaders);
    setTitle('');
    await loadPrivateArea();
  };

  if (!token) {
    return (
      <div className="auth-layout">
        <div className="card">
          <h1>SportTips Pro</h1>
          <p>Palpites premium semanais para web e mobile.</p>
          <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Palavra-passe" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="actions">
            <button onClick={login}>Entrar</button>
            <button className="secondary" onClick={register}>Criar conta</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="dashboard">
      <header>
        <div>
          <h1>Área Privada</h1>
          <p>Plano: {profile?.subscription?.plan || 'BASIC'} · Estado: {profile?.subscription?.status || 'inactive'}</p>
        </div>
        <button onClick={() => { localStorage.removeItem('token'); setToken(''); }}>Terminar sessão</button>
      </header>

      <section className="grid">
        <article className="card">
          <h2>Palpites da semana</h2>
          {tips.map((tip) => <p key={tip.id}>⚽ {tip.title} — {tip.prediction}</p>)}
        </article>

        <article className="card">
          <h2>Taxa de acerto</h2>
          <strong>{stats.success_rate}%</strong>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={history.map((h, i) => ({ i, odd: Number(h.odds || 1) }))}>
                <XAxis dataKey="i" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="odd" stroke="#6c63ff" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card">
          <h2>Admin rápido</h2>
          <input placeholder="Título do palpite" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button onClick={createTip}>Publicar palpite</button>
          <p className="muted">Requer conta com role admin na base de dados.</p>
        </article>
      </section>
    </main>
  );
}
