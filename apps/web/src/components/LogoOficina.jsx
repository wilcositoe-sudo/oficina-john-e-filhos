export default function LogoOficina({ className = '', compacto = false }) {
  return (
    <span className={`oficina-logo ${compacto ? 'oficina-logo-compacto' : ''} ${className}`.trim()}>
      <svg className="oficina-logo-simbolo" viewBox="0 0 64 64" role="img" aria-label="Logotipo John e Filhos">
        <path d="M32 4 57 17v30L32 60 7 47V17L32 4Z" fill="currentColor" opacity=".14" />
        <path d="M32 7 54 19v26L32 57 10 45V19L32 7Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M26 20v17c0 5-3 8-8 8-2 0-4-.5-5.5-1.6l3-5c.8.6 1.6.9 2.5.9 1.5 0 2.5-.9 2.5-2.7V20h5.5Z" fill="currentColor" />
        <path d="M31 20h18v5H36.5v5h10v5h-10v10H31V20Z" fill="currentColor" />
        <path d="M14 51h36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="oficina-logo-texto">
        <strong>JOHN &amp; FILHOS</strong>
        {!compacto && <small>Excelência em cada reparação.</small>}
      </span>
    </span>
  );
}
