import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Rodape from './components/Rodape.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Cadastro from './pages/Cadastro.jsx'
import Perfil from './pages/Perfil.jsx'
import LivroDetalhe from './pages/LivroDetalhe.jsx'
import LivroForm from './pages/LivroForm.jsx'
import Estante from './pages/Estante.jsx'
import Favoritos from './pages/Favoritos.jsx'
import Emprestimos from './pages/Emprestimos.jsx'
import Resenhas from './pages/Resenhas.jsx'
import Admin from './pages/Admin.jsx'
import NaoEncontrado from './pages/NaoEncontrado.jsx'

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/resenhas" element={<Resenhas />} />
          <Route path="/livros/:id" element={<LivroDetalhe />} />

          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/estante" element={<ProtectedRoute><Estante /></ProtectedRoute>} />
          <Route path="/favoritos" element={<ProtectedRoute><Favoritos /></ProtectedRoute>} />
          <Route path="/emprestimos" element={<ProtectedRoute><Emprestimos /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute somenteAdmin><Admin /></ProtectedRoute>} />
          <Route path="/admin/livros/novo" element={<ProtectedRoute somenteAdmin><LivroForm /></ProtectedRoute>} />
          <Route path="/admin/livros/:id/editar" element={<ProtectedRoute somenteAdmin><LivroForm /></ProtectedRoute>} />

          <Route path="*" element={<NaoEncontrado />} />
        </Routes>
      </main>
      <Rodape />
    </>
  )
}
