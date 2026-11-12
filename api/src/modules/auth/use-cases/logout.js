export function criarLogout({ sessaoRepo }) {
  return function logout({ token }) {
    return sessaoRepo.revogar(token);
  };
}
