import { useEffect, useState } from 'react';
import api from '../../services/api';
import { errorText } from '../manage/shared';

const dataTexto = (valor) => (valor ? new Date(valor).toLocaleDateString('pt-BR') : '');

// Termo de matrícula e aditivos assinados. Os links vêm da própria matrícula do aluno.
export default function TermosSection() {
  const [matriculas, setMatriculas] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .get('/portal/documentos')
      .then(({ data }) => setMatriculas(data.matriculas || []))
      .catch((err) => setErro(errorText(err, 'Não foi possível carregar seus termos.')));
  }, []);

  return (
    <section className="surface-card documentos-termos" aria-labelledby="termos-titulo">
      <h2 id="termos-titulo">Termo de matrícula e aditivos</h2>
      <p className="muted">Os termos assinados de cada matrícula. Abra o PDF para ver ou baixar.</p>

      {erro && <div className="alert error">{erro}</div>}
      {!erro && matriculas === null && <p className="muted">Carregando...</p>}
      {matriculas && matriculas.length === 0 && (
        <p className="muted">Seu termo aparece aqui assim que for assinado.</p>
      )}

      {(matriculas || []).map((matricula) => {
        const termos = [...matricula.termos].sort((a, b) => (a.tipo === b.tipo ? a.numero - b.numero : a.tipo === 'matricula' ? -1 : 1));
        return (
          <article key={matricula.id} className="documentos-matricula">
            <h3>{matricula.curso}</h3>
            {termos.length === 0 && <p className="muted">Nenhum termo assinado nesta matrícula ainda.</p>}
            <ul className="documentos-lista">
              {termos.map((termo) => (
                <li key={`${termo.tipo}-${termo.numero}`} className="documentos-item">
                  <div>
                    <strong>{termo.tipo === 'matricula' ? 'Termo de matrícula' : `Aditivo nº ${termo.numero}`}</strong>
                    {termo.dataAssinatura && <span className="muted"> · assinado em {dataTexto(termo.dataAssinatura)}</span>}
                  </div>
                  {termo.link ? (
                    <a className="ghost-button small" href={termo.link} target="_blank" rel="noreferrer">Abrir PDF</a>
                  ) : (
                    <span className="muted">Disponível em breve</span>
                  )}
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
