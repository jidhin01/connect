import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './component/login'
import Sidenav from './component/Sidenav'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/logined" element={<Sidenav />} />
      </Routes>
    </Router>
    </>
  )
}

export default App
