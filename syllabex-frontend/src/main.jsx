import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import './index.css'
import { GOOGLE_CLIENT_ID } from './config/config.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.875rem',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            },
            success: {
              iconTheme: { primary: '#C80000', secondary: '#FFF' },
              style: { borderLeft: '4px solid #C80000' },
            },
            error: {
              style: { borderLeft: '4px solid #FF2222' },
            },
          }}
        />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
)
