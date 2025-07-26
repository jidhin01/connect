import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

function ProtectedRoute({ children }) {
  const { user } = useUser();
  return user ? children : <Navigate to="/" />;
}

export default ProtectedRoute;