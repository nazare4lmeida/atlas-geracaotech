export default function CertificatePreview({ name, courseName, issuedAt }) {
  return (
    <div className="certificate-preview" id="certificate-preview">
      <div className="certificate-border">
        <span className="eyebrow">Certificado de conclusão</span>
        <h2>Atlas - Geração Tech</h2>
        <p>Certificamos que</p>
        <h3>{name}</h3>
        <p>concluiu com aproveitamento a trilha</p>
        <h4>{courseName}</h4>
        <p>Data de emissão: {issuedAt}</p>
      </div>
    </div>
  );
}
