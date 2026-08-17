import { AuthProvider } from './store/AuthContext.jsx'
import { ChatProvider } from './store/ChatContext.jsx'
import AppRoutes from './routes/AppRoutes.jsx'

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppRoutes />
      </ChatProvider>
    </AuthProvider>
  )
}
