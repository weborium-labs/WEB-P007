import { BrowserRouter, Route, Routes } from "react-router-dom"

const App = () => {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<h1 className="text-blue-500">WEB-P007 Project setup</h1>} />
          <Route path="/api/v1/auth/signup" element={<h1 className="text-blue-500">WEB-P007 SIGNUP</h1>} />
          <Route path="/api/v1/auth/login" element={<h1 className="text-blue-500">WEB-P007 LOGIN</h1>} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
