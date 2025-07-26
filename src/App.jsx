import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/login';
import Sidenav from './pages/Sidenav';
import ProtectedRoute from './routes/ProtectedRoute';
import Feed from './pages/home';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/feed" element={<Feed />} />
        <Route
          path="/logined"
          element={
            // <ProtectedRoute>
              <Sidenav />
            // </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;