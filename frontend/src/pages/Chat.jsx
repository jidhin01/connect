import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Chat() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home page, preserving the intent to chat if possible
    // The previous logic in Home.jsx handles chat selection via state/localStorage
    navigate('/logined');
  }, [navigate]);

  return null;
}