import logo from './logo.svg';
import './App.css';
import AuthPage from './pages/auth/auth.jsx';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore.js';
import { useEffect } from 'react';
import HomePage from './pages/home/HomePage.jsx';
import ProfilePage from './pages/profile/ProfilePage.jsx';
import SettingsPage from './pages/settings/SettingsPage.jsx';
import Navbar from './components/navbar/Navbar.jsx';

function App() {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if(isCheckingAuth) {
    return <div>Loading...</div>;
  }

  
  console.log(authUser);
  return (
    <>
      <Navbar />
      <Routes>
        <Route path='/' element={ authUser ? <HomePage /> : <Navigate to='/auth' />}/>
        <Route path='/auth' element={!authUser ? <AuthPage /> : <Navigate to="/" />}/>
        <Route path='/profile' element={authUser ? <ProfilePage /> : <Navigate to='/auth' />}/>
        <Route path='/settings' element={<SettingsPage />}/>
      </Routes>
    </>
  );
}

export default App;
