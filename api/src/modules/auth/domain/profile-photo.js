const FORMATOS = new Map([
  ['image/jpeg', {
    extensao: 'jpg',
    validar: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  }],
  ['image/png', {
    extensao: 'png',
    validar: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  }],
  ['image/webp', {
    extensao: 'webp',
    validar: (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
  }],
]);

export function validarFotoPerfil(tipo, buffer) {
  const formato = FORMATOS.get(tipo);
  if (!formato || !Buffer.isBuffer(buffer) || !formato.validar(buffer)) return null;
  return formato.extensao;
}
