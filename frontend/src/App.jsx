import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/login';
import MainLayout from './components/MainLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import Chat from './pages/Chat';
import { UserProvider } from './context/UserContext';

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>

          {/* Public route */}
          <Route path="/" element={<Login />} />

          {/* Public routes (you can protect them too if needed) */}
          <Route path="/chat" element={<Chat />} />

          {/* Protected route - Main application with Sidebar */}
          <Route
            path="/logined"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;