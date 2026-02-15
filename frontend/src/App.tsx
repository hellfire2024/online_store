
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// Import main pages
import HomePage from "../pages/HomePage";
import StorePage from "../pages/StorePage";
import AdminPage from "../pages/admin/AdminPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/admin/*" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;
