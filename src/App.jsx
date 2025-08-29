import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/login';
import Sidenav from './pages/Sidenav';
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

          {/* Protected route */}
          <Route
            path="/logined"
            element={
              <ProtectedRoute>
                <Sidenav />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;