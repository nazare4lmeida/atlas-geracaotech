// Compartilhamento no LinkedIn: link "Adicionar ao perfil" (com o certificado já preenchido) e texto pronto para publicar.
const TIPO_LABEL = { conclusao: 'Conclusão', participacao: 'Participação' };
const ORG_ID = import.meta.env.VITE_LINKEDIN_ORG_ID || '';

export function tipoLabel(tipo) {
  return TIPO_LABEL[tipo] || 'Conclusão';
}

export function linkedinAddUrl(cert) {
  const issued = new Date(cert.issuedAt);
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: `${cert.courseName} (${tipoLabel(cert.tipo)}) · Geração Tech`,
    organizationName: 'Geração Tech',
    issueYear: String(issued.getFullYear()),
    issueMonth: String(issued.getMonth() + 1),
    certUrl: cert.verificationUrl || '',
    certId: cert.authCode || ''
  });
  if (ORG_ID) params.set('organizationId', ORG_ID);
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

// Texto pronto para colar na publicação. A menção à página da Geração Tech é feita pelo próprio LinkedIn (@).
export function linkedinPostText(cert) {
  return [
    `🎓 Concluí o certificado de ${tipoLabel(cert.tipo).toLowerCase()} em "${cert.courseName}" pela @Geração Tech!`,
    '',
    `Confira a autenticidade: ${cert.verificationUrl || ''}`,
    `Código de autenticação: ${cert.authCode || ''}`,
    '',
    '#GeraçãoTech #Atlas #Tecnologia'
  ].join('\n');
}
