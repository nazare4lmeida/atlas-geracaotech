import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

// Página pública de autenticidade: abre pelo QR code (/verificar/CODIGO) ou pelo campo de código.
export default function VerifyCertificatePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code || '');
  const [state, setState] = useState({ status: code ? 'loading' : 'idle' });

  useEffect(() => {
    if (!code) {
      setState({ status: 'idle' });
      return undefined;
    }
    let active = true;
    setState({ status: 'loading' });
    api
      .get(`/verify/${encodeURIComponent(code)}`)
      .then(({ data }) => active && setState({ status: 'valid', certificate: data.certificate }))
      .catch((error) => {
        if (!active) return;
        const notFound = error.response?.status === 404;
        setState({
          status: notFound ? 'invalid' : 'error',
          message: error.response?.data?.message || 'Não foi possível consultar agora. Tente novamente.'
        });
      });
    return () => {
      active = false;
    };
  }, [code]);

  const submit = (event) => {
    event.preventDefault();
    const normalized = input.trim().toUpperCase();
    if (normalized) navigate(`/verificar/${normalized}`);
  };

  return (
    <main className="verify-page">
      <section className="surface-card verify-card">
        <h1>Verificar certificado</h1>
        <p className="muted-text">Digite o código de autenticação impresso no certificado ou leia o QR code.</p>

        <form className="verify-form" onSubmit={submit}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ex.: GT-FULLST-2026-0001"
            aria-label="Código de autenticação"
            autoComplete="off"
          />
          <button type="submit" className="primary-button">Verificar</button>
        </form>

        {state.status === 'loading' && <p className="muted-text">Consultando…</p>}

        {state.status === 'valid' && (
          <div className="verify-result is-valid" role="status">
            <p className="verify-badge">Certificado válido</p>
            <dl>
              <dt>Aluno</dt>
              <dd>{state.certificate.studentName}</dd>
              <dt>Curso</dt>
              <dd>{state.certificate.courseName}</dd>
              <dt>Carga horária</dt>
              <dd>{state.certificate.workload ? `${state.certificate.workload}h/aula` : 'Não informada'}</dd>
              <dt>Emitido em</dt>
              <dd>{new Date(state.certificate.issuedAt).toLocaleDateString('pt-BR')}</dd>
              <dt>Código</dt>
              <dd className="verify-code">{state.certificate.authCode}</dd>
            </dl>
          </div>
        )}

        {state.status === 'invalid' && (
          <div className="verify-result is-invalid" role="status">
            <p className="verify-badge">Certificado não encontrado</p>
            <p className="muted-text">Confira o código. Ele precisa ser idêntico ao impresso no certificado.</p>
          </div>
        )}

        {state.status === 'error' && <div className="alert error">{state.message}</div>}
      </section>
    </main>
  );
}
