import React from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';

function HomePage() {
  const { logout } = useAuthStore();

  const handleClick = (e) => {
    e.preventDefault();
    logout();
  };

  return (
    <div style={{height:"100vh", width:"100vw", display:"flex", justifyContent:"center", alignItems:"center"}}> // Add styles to center the content
      HomePage
      <button style={{top: "100"}} type='submit' onClick={handleClick}>Logout</button>
    </div>
  );
}

export default HomePage;
