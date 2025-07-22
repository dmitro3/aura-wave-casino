import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { LevelSyncProvider } from '@/contexts/LevelSyncContext'
import { Toaster } from '@/components/ui/toaster'

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <LevelSyncProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster />
      </LevelSyncProvider>
    </AuthProvider>
  </StrictMode>
)