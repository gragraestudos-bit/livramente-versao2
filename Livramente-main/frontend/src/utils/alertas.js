// Mensagens padronizadas de sucesso, erro, aviso e confirmação (SweetAlert2).
// Essas são "aquelas telinhas bonitas" pedidas no roteiro.
import Swal from 'sweetalert2'

const ROXO = '#8654C7'
const ROXO_ESCURO = '#4B267A'
const VERMELHO = '#B73558'

const base = {
  confirmButtonColor: ROXO,
  cancelButtonColor: '#9b8bb4',
  buttonsStyling: true,
  heightAuto: false,
}

export function alertaSucesso(titulo, texto = '') {
  return Swal.fire({ ...base, icon: 'success', title: titulo, text: texto, confirmButtonText: 'Ok' })
}

export function alertaErro(titulo, texto = '') {
  return Swal.fire({ ...base, icon: 'error', title: titulo, text: texto, confirmButtonText: 'Entendi' })
}

export function alertaInfo(titulo, texto = '') {
  return Swal.fire({ ...base, icon: 'info', title: titulo, text: texto, confirmButtonText: 'Ok' })
}

// Aviso específico de falta de autorização / necessidade de login.
export function alertaSemAutorizacao(texto = 'Você precisa estar autenticado para realizar esta ação.') {
  return Swal.fire({
    ...base,
    icon: 'warning',
    iconColor: ROXO_ESCURO,
    title: 'Acesso não autorizado',
    text: texto,
    confirmButtonText: 'Ok',
  })
}

// Confirmação (retorna true/false). Usada em exclusões.
export async function confirmar(titulo, texto = '', confirmarTexto = 'Sim, confirmar') {
  const r = await Swal.fire({
    ...base,
    icon: 'question',
    title: titulo,
    text: texto,
    showCancelButton: true,
    confirmButtonText: confirmarTexto,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: VERMELHO,
    reverseButtons: true,
  })
  return r.isConfirmed
}

// Notificação discreta no canto (toast).
export function toast(titulo, icon = 'success') {
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title: titulo,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
    heightAuto: false,
  })
}
