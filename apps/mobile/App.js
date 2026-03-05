import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { useState } from 'react';
import { SafeAreaView, Text, TextInput, TouchableOpacity, View, FlatList } from 'react-native';

const api = axios.create({ baseURL: 'http://localhost:4000' });

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [tips, setTips] = useState([]);

  const login = async () => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    const weekly = await api.get('/tips/week', { headers: { Authorization: `Bearer ${data.token}`, 'x-device-id': 'mobile-main' } });
    setTips(weekly.data);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', padding: 16 }}>
      <Text style={{ color: '#fff', fontSize: 26, fontWeight: '700' }}>SportTips Mobile</Text>
      <Text style={{ color: '#94a3b8', marginBottom: 16 }}>Palpites semanais exclusivos</Text>

      {!token ? (
        <View>
          <TextInput style={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }} placeholderTextColor="#94a3b8" placeholder="Email" value={email} onChangeText={setEmail} />
          <TextInput secureTextEntry style={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }} placeholderTextColor="#94a3b8" placeholder="Password" value={password} onChangeText={setPassword} />
          <TouchableOpacity onPress={login} style={{ backgroundColor: '#6c63ff', borderRadius: 10, padding: 12 }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Entrar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tips}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#1e293b', borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{item.title}</Text>
              <Text style={{ color: '#cbd5e1' }}>{item.prediction}</Text>
            </View>
          )}
        />
      )}

      <StatusBar style="light" />
    </SafeAreaView>
  );
}
